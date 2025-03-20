const checkBalance = async () => {
    if (!userAddress) {
        console.error("❌ Ошибка: userAddress не найден!");
        return 0;
    }

    const requestBody = {
        type: "userState",  // ✅ API поддерживает "userState" для получения баланса
        user: userAddress
    };

    console.log("📤 Отправляем запрос на баланс:", JSON.stringify(requestBody, null, 2));

    try {
        const response = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("❌ Ошибка API:", text);
            return { exchangeBalance: 0, vaultBalance: 0 };
        }

        const responseJson = await response.json();
        console.log("📩 Ответ от API (баланс):", responseJson);

        // ✅ Проверяем, есть ли баланс USDC
        const exchangeBalance = responseJson?.assets?.find(asset => asset.asset === "USDC")?.balance || 0;
        const vaultBalance = responseJson?.vault?.usd || 0;  // 🔹 Проверяем баланс в `vault`

        return { exchangeBalance: parseFloat(exchangeBalance), vaultBalance: parseFloat(vaultBalance) };
    } catch (error) {
        console.error("❌ Ошибка при запросе баланса:", error);
        return { exchangeBalance: 0, vaultBalance: 0 };
    }
};

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
    const { exchangeBalance, vaultBalance } = await checkBalance();

    if (exchangeBalance < amount && vaultBalance < amount) {
        console.error(`❌ Недостаточно средств! Доступно: ${exchangeBalance} USDC + ${vaultBalance} в Vault`);
        status.innerText = `❌ Недостаточно средств! Доступно: ${exchangeBalance} USDC + ${vaultBalance} в Vault`;
        return;
    }

    // ✅ Определяем тип запроса (вывод из `vault` или обычный `withdraw3`)
    let action, signature;
    const timestamp = Date.now();

    if (vaultBalance >= amount) {
        console.log("🔹 Выводим средства из Vault (vaultTransfer)");
        action = {
            type: "vaultTransfer",
            vaultAddress: userAddress,
            isDeposit: false,
            usd: amount,
        };
    } else {
        console.log("🔹 Обычный вывод (withdraw3)");
        action = {
            hyperliquidChain: "Mainnet",
            signatureChainId: "0x66eee",
            destination: userAddress,
            amount: amount,
            time: timestamp,
            type: "withdraw3",
        };
    }

    console.log("📤 Данные для подписи:", JSON.stringify(action, null, 2));

    try {
        signature = await window.ethereum.request({
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

        console.log("✅ Подпись получена:", signature);

        // ✅ Формируем финальный JSON-запрос
        const requestBody = {
            action: action,
            nonce: timestamp,
            signature: signature,
        };

        console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

        // 📌 Отправляем запрос на вывод
        const response = await fetch("https://api.hyperliquid.xyz/exchange", {
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
