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
            // Формируем JSON, похожий на CCXT
            const withdrawData = {
                type: "withdraw", // ✅ Тип операции, аналогично CCXT
                user: userAddress, // ✅ Адрес пользователя
                delta: {
                    type: "accountClassTransfer",
                    usdc: amount.toString(), // ✅ Сумма в USDC
                    toPerp: false // ✅ Не переводим на Perp
                },
                time: Date.now()
            };

            console.log("📤 Запрос перед отправкой:", JSON.stringify(withdrawData, null, 2));

            // Подписываем данные через MetaMask (EIP-712)
            const signature = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [userAddress, JSON.stringify(withdrawData)]
            });

            console.log("✅ Подпись получена:", signature);

            // Создаём JSON-запрос, как в CCXT
            const requestBody = {
                type: "withdraw",
                message: withdrawData,
                signature: signature
            };

        

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
