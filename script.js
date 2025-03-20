document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletButton = document.getElementById("connectWallet");
    const withdrawButton = document.getElementById("withdrawButton");
    const status = document.getElementById("status");
    const walletAddressField = document.getElementById("walletAddress");
    let userAddress = null;

    const API_URL = "https://api.hyperliquid.xyz/exchange"; // Hyperliquid API

    if (typeof window.ethereum !== "undefined") {
        console.log("✅ MetaMask detected");
        window.web3 = new Web3(window.ethereum);
    } else {
        console.error("❌ MetaMask not detected");
        status.innerText = "❌ MetaMask not detected. Please install it.";
        return;
    }

    // Подключение MetaMask
    connectWalletButton.addEventListener("click", async () => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet connected:", userAddress);
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            status.innerText = "❌ Failed to connect wallet.";
        }
    });

    withdrawButton.addEventListener("click", async () => {
        if (!userAddress) {
            status.innerText = "❌ Please connect wallet first!";
            return;
        }

        const apiKey = document.getElementById("apiKey").value;
        const apiSecret = document.getElementById("apiSecret").value;
        const amount = parseFloat(document.getElementById("amount").value).toFixed(2);

        if (!apiKey || !apiSecret || !amount || amount <= 0) {
            status.innerText = "❌ Enter API Key, Secret, and a valid Amount!";
            return;
        }

        try {
            // Создаём данные в точности, как требует API
            const message = {
                destination: userAddress, 
                amount: amount.toString(), 
                time: Date.now(), 
                type: "withdraw3",
                signatureChainId: "0xa4b1",
                hyperliquidChain: "Mainnet"
            };

            const domain = {
                name: "HyperliquidSignTransaction",
                version: "1",
                chainId: 42161,
                verifyingContract: "0x0000000000000000000000000000000000000000"
            };

            const types = {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                "HyperliquidTransaction:Withdraw": [
                    { name: "hyperliquidChain", type: "string" },
                    { name: "destination", type: "string" },
                    { name: "amount", type: "string" },
                    { name: "time", type: "uint64" }
                ]
            };

            console.log("📤 Данные для подписи:", JSON.stringify({ domain, types, primaryType: "HyperliquidTransaction:Withdraw", message }, null, 2));

            // Подписываем данные через MetaMask
            const signature = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [userAddress, JSON.stringify({
                    domain,
                    types,
                    primaryType: "HyperliquidTransaction:Withdraw",
                    message
                })]
            });

            console.log("✅ Подпись получена:", signature);

            // Итоговый JSON-запрос (теперь он 1-в-1 как в API)
            const requestBody = {
                domain,
                message,
                primaryType: "HyperliquidTransaction:Withdraw",
                types,
                signature
            };

            console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

            // Отправляем запрос в Hyperliquid API
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "api-key": apiKey,
                    "api-secret": apiSecret
                },
                body: JSON.stringify(requestBody)
            });

            const responseText = await response.text();
            try {
                const responseData = JSON.parse(responseText);
                console.log("📩 Ответ от API:", responseData);
                if (response.ok) {
                    status.innerText = "✅ Withdraw successful!";
                } else {
                    status.innerText = `❌ Error: ${responseData.message || "Unknown error"}`;
                }
            } catch (jsonError) {
                console.error("❌ Ошибка при обработке JSON:", responseText);
                status.innerText = `❌ API error: ${responseText}`;
            }
        } catch (error) {
            console.error("❌ Ошибка при выводе:", error);
            status.innerText = `❌ Error: ${error.message}`;
        }
    });
});
