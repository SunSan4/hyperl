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

    // Подключение MetaMask с проверкой userAddress
    connectWalletButton.addEventListener("click", async () => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            if (accounts.length === 0) {
                throw new Error("❌ No accounts found in MetaMask!");
            }
            userAddress = accounts[0]; // ✅ Используем правильный кошелёк
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
            console.error("❌ No connected wallet!");
            return;
        }

        const apiKey = document.getElementById("apiKey").value;
        const apiSecret = document.getElementById("apiSecret").value;
        const amount = parseFloat(document.getElementById("amount").value).toFixed(2);

        if (!apiKey || !apiSecret || !amount || amount <= 0) {
            status.innerText = "❌ Enter API Key, Secret, and a valid Amount!";
            console.error("❌ Invalid API credentials or amount!");
            return;
        }

        try {
            // Проверяем, пуст ли userAddress
            if (!userAddress || userAddress.length !== 42) {
                throw new Error("❌ Invalid Ethereum address detected!");
            }

            const timestamp = Date.now();

            // Формируем данные для подписи (аналогично CCXT)
            const action = {
                hyperliquidChain: "Mainnet",
                signatureChainId: "0x66eee",
                destination: userAddress,  // ✅ Ставим userAddress вместо destination
                amount: amount.toString(),
                time: timestamp,
                type: "withdraw3"
            };

            // Подписываем `action` через MetaMask (EIP-712)
            const signatureRaw = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [userAddress, JSON.stringify({
                    domain: {
                        name: "HyperliquidSignTransaction",
                        version: "1",
                        chainId: 42161,
                        verifyingContract: "0x0000000000000000000000000000000000000000"
                    },
                    types: {
                        EIP712Domain: [
                            { name: "name", type: "string" },
                            { name: "version", type: "string" },
                            { name: "chainId", type: "uint256" },
                            { name: "verifyingContract", type: "address" }
                        ],
                        Withdraw: [
                            { name: "hyperliquidChain", type: "string" },
                            { name: "destination", type: "string" },
                            { name: "amount", type: "string" },
                            { name: "time", type: "uint64" }
                        ]
                    },
                    primaryType: "Withdraw",
                    message: action
                })]
            });

            console.log("✅ Подпись получена:", signatureRaw);

            // Разбираем подпись в r, s, v
            const r = "0x" + signatureRaw.slice(2, 66);
            const s = "0x" + signatureRaw.slice(66, 130);
            const v = parseInt(signatureRaw.slice(130, 132), 16);

            // Финальный JSON-запрос (аналогичный CCXT)
            const requestBody = {
                action,
                nonce: timestamp,
                signature: { r, s, v }
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
                    status.innerText = `❌ Error: ${responseData.response || "Unknown error"}`;
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
