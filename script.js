document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletButton = document.getElementById("connectWallet");
    const withdrawButton = document.getElementById("withdrawButton");
    const status = document.getElementById("status");
    const walletAddressField = document.getElementById("walletAddress");
    let userAddress = null;

    const API_URL = "https://api.hyperliquid.xyz/exchange";
    const API_INFO_URL = "https://api.hyperliquid.xyz/info";

    if (typeof window.ethereum !== "undefined") {
        console.log("✅ MetaMask detected");
        window.web3 = new Web3(window.ethereum);
    } else {
        console.error("❌ MetaMask not detected");
        status.innerText = "❌ MetaMask not detected. Please install it.";
        return;
    }

    // 📌 Подключение MetaMask
    connectWalletButton.addEventListener("click", async () => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            if (accounts.length === 0) {
                throw new Error("❌ No accounts found in MetaMask!");
            }
            userAddress = accounts[0];
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet connected:", userAddress);
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            status.innerText = "❌ Failed to connect wallet.";
        }
    });

    // 📌 Проверка баланса перед выводом
    const checkBalance = async () => {
        if (!userAddress) {
            console.error("❌ Ошибка: userAddress не найден!");
            return 0;
        }

        const requestBody = {
            type: "userBalances",
            user: userAddress  // ✅ Используем правильный userAddress
        };

        console.log("📤 Отправляем запрос на баланс:", JSON.stringify(requestBody, null, 2));

        try {
            const response = await fetch(API_INFO_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("❌ Ошибка API:", text);
                return 0;
            }

            const responseJson = await response.json();
            console.log("📩 Ответ от API (баланс):", responseJson);

            return responseJson.withdrawable ? parseFloat(responseJson.withdrawable) : 0;
        } catch (error) {
            console.error("❌ Ошибка при запросе баланса:", error);
            return 0;
        }
    };

    // 📌 Выполняем вывод
    withdrawButton.addEventListener("click", async () => {
        if (!userAddress) {
            status.innerText = "❌ Please connect wallet first!";
            console.error("❌ No connected wallet!");
            return;
        }

        console.log("🔍 Адрес из MetaMask:", userAddress);

        const amount = document.getElementById("amount").value.trim();
        if (!amount || amount <= 0) {
            status.innerText = "❌ Enter a valid amount!";
            console.error("❌ Invalid withdrawal amount!");
            return;
        }

        // ✅ Проверяем баланс перед отправкой
        const balance = await checkBalance();
        if (balance < amount) {
            console.error(`❌ Недостаточно средств! Доступно: ${balance} USDC`);
            status.innerText = `❌ Недостаточно средств! Доступно: ${balance} USDC`;
            return;
        }

        // ✅ Готовим данные для подписи
        const timestamp = Date.now();
        const action = {
            hyperliquidChain: "Mainnet",
            signatureChainId: "0x66eee",
            destination: userAddress,
            amount: amount,
            time: timestamp,
            type: "withdraw3",
        };

        console.log("📤 Данные для подписи:", JSON.stringify(action, null, 2));

        try {
            const signatureRaw = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [userAddress, JSON.stringify({
                    domain: {
                        name: "HyperliquidSignTransaction",
                        version: "1",
                        chainId: 42161,
                        verifyingContract: "0x0000000000000000000000000000000000000000",
                    },
                    types: {
                        EIP712Domain: [
                            { name: "name", type: "string" },
                            { name: "version", type: "string" },
                            { name: "chainId", type: "uint256" },
                            { name: "verifyingContract", type: "address" },
                        ],
                        HyperliquidTransactionWithdraw: [  // ✅ Убрали `:` в названии типа
                            { name: "hyperliquidChain", type: "string" },
                            { name: "destination", type: "string" },
                            { name: "amount", type: "string" },
                            { name: "time", type: "uint64" },
                        ],
                    },
                    primaryType: "HyperliquidTransactionWithdraw", // ✅ Тоже убрали `:` здесь
                    message: action,
                })],
            });

            console.log("✅ Подпись получена:", signatureRaw);

            // ✅ Формируем финальный JSON-запрос
            const requestBody = {
                action: action,
                nonce: timestamp,
                signature: signatureRaw,
            };

            console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

            // 📌 Отправляем запрос на вывод
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const responseJson = await response.json();
            console.log("📩 Ответ от API:", responseJson);

            if (responseJson.status === "ok") {
                status.innerText = "✅ Вывод успешно отправлен!";
                console.log("✅ Успешный вывод!");
            } else {
                status.innerText = `❌ Ошибка при выводе: ${responseJson.response}`;
                console.error("❌ Ошибка при выводе:", responseJson.response);
            }
        } catch (error) {
            console.error("❌ Ошибка при подписании или отправке запроса:", error);
            status.innerText = "❌ Ошибка при отправке вывода!";
        }
    });
});
