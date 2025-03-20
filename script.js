document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletButton = document.getElementById("connectWallet");
    const withdrawButton = document.getElementById("withdrawButton");
    const status = document.getElementById("status");
    const walletAddressField = document.getElementById("walletAddress");
    let userAddress = null;

    const API_URL = "https://api.hyperliquid.xyz/exchange";

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
            userAddress = accounts[0].toLowerCase(); // ✅ Делаем адрес в нижнем регистре
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet connected:", userAddress);
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            status.innerText = "❌ Failed to connect wallet.";
        }
    });

    // 📌 Выполняем вывод
    withdrawButton.addEventListener("click", async () => {
        if (!userAddress) {
            status.innerText = "❌ Please connect wallet first!";
            console.error("❌ No connected wallet!");
            return;
        }

        console.log("🔍 Адрес из MetaMask:", userAddress);

        const amountInput = document.getElementById("amount").value.trim();
        if (!amountInput || amountInput <= 0) {
            status.innerText = "❌ Enter a valid amount!";
            console.error("❌ Invalid withdrawal amount!");
            return;
        }

        const amount = parseFloat(amountInput).toFixed(2);

        // ✅ Формируем action
        const timestamp = Date.now();
        const action = {
            hyperliquidChain: "Mainnet",
            signatureChainId: "0x66eee",
            destination: userAddress,  // ✅ Исправлено (MetaMask -> lowercase)
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
                        HyperliquidTransactionWithdraw: [
                            { name: "hyperliquidChain", type: "string" },
                            { name: "destination", type: "string" },
                            { name: "amount", type: "string" },
                            { name: "time", type: "uint64" },
                        ],
                    },
                    primaryType: "HyperliquidTransactionWithdraw",
                    message: action,
                })],
            });

            console.log("✅ Подпись получена:", signatureRaw);

            // ✅ Разбиваем подпись на `r`, `s`, `v`
            const r = signatureRaw.slice(0, 66);
            const s = "0x" + signatureRaw.slice(66, 130);
            const v = parseInt(signatureRaw.slice(130, 132), 16) + 27;

            // ✅ Формируем финальный JSON-запрос
            const requestBody = {
                action: action,
                nonce: timestamp,
                signature: { r, s, v },
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
