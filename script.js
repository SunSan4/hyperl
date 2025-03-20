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
        const amount = document.getElementById("amount").value;

        if (!apiKey || !apiSecret || !amount || amount <= 0) {
            status.innerText = "❌ Enter API Key, Secret, and a valid Amount!";
            return;
        }

        try {
            // Создаём правильные данные для EIP-712 подписи
            const withdrawMessage = {
                destination: userAddress,  // Адрес вывода
                amount: amount.toString(), // Сумма в виде строки
                time: Math.floor(Date.now() / 1000), // Время в секундах
                type: "withdraw",
                signatureChainId: "0xa4b1",
                hyperliquidChain: "Mainnet"
            };

            // EIP-712 домен (универсальный для всех подписей)
            const domain = {
                name: "HyperliquidSignTransaction",
                version: "1",
                chainId: 42161,
                verifyingContract: "0x0000000000000000000000000000000000000000"
            };

            // EIP-712 типы
            const types = {
                EIP712Domain: [
                    { name: "name", type: "string" },
                    { name: "version", type: "string" },
                    { name: "chainId", type: "uint256" },
                    { name: "verifyingContract", type: "address" }
                ],
                Withdraw: [
                    { name: "destination", type: "address" },
                    { name: "amount", type: "string" }, // Сумма как строка
                    { name: "time", type: "uint64" }, // Время как uint64
                    { name: "type", type: "string" },
                    { name: "signatureChainId", type: "string" },
                    { name: "hyperliquidChain", type: "string" }
                ]
            };

            // Выводим данные для подписи
            console.log("📤 Данные для подписи:", JSON.stringify(withdrawMessage, null, 2));

            // Подписываем данные через MetaMask (правильный формат EIP-712)
            const signature = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [userAddress, JSON.stringify({ domain, types, primaryType: "Withdraw", message: withdrawMessage })]
            });

            console.log("✅ Подпись получена:", signature);

            // Создаём JSON-запрос
            const requestBody = {
                type: "withdraw",
                message: withdrawMessage,
                signature: signature
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
