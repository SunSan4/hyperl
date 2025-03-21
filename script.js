document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("withdrawButton").addEventListener("click", withdrawFunds);

let userAddress = "";

// 📌 Подключаем MetaMask
async function connectWallet() {
    if (!window.ethereum) {
        alert("🦊 Установи MetaMask!");
        return;
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    document.getElementById("walletAddress").innerText = `🔗 Wallet: ${userAddress}`;
    console.log("✅ Подключен кошелек:", userAddress);

    // Включаем кнопку вывода
    document.getElementById("withdrawButton").disabled = false;

    // Загружаем баланс после подключения
    fetchBalance(userAddress);
}

// 📌 Отправляем запрос на вывод
async function withdrawFunds() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const apiSecret = document.getElementById("apiSecret").value.trim();
    const amount = document.getElementById("amount").value.trim();

    if (!apiKey || !apiSecret) {
        alert("❌ Введите API Key и Secret!");
        return;
    }
    if (!amount || amount <= 0) {
        alert("❌ Введите сумму для вывода!");
        return;
    }

    console.log("📤 Готовим вывод:", amount, "USDC");

    const timestamp = Date.now();
    const withdrawalAction = {
        type: "withdraw3",
        hyperliquidChain: "Mainnet",
        signatureChainId: "0xa4b1",
        destination: userAddress, // Выводим на кошелек MetaMask
        amount: amount.toString(),
        time: timestamp,
    };

    console.log("📤 Данные для подписи:", withdrawalAction);

    try {
        const signatureRaw = await window.ethereum.request({
            method: "eth_signTypedData_v4",
            params: [userAddress, JSON.stringify({
                domain: { name: "HyperliquidSignTransaction", version: "1", chainId: 42161, verifyingContract: "0x0000000000000000000000000000000000000000" },
                types: { Withdraw: [{ name: "destination", type: "address" }, { name: "amount", type: "string" }, { name: "time", type: "uint64" }] },
                primaryType: "Withdraw",
                message: withdrawalAction
            })]
        });

        console.log("✅ Подпись получена:", signatureRaw);

        const r = signatureRaw.slice(0, 66);
        const s = "0x" + signatureRaw.slice(66, 130);
        const v = parseInt(signatureRaw.slice(130, 132), 16);

        const requestBody = {
            action: withdrawalAction,
            nonce: timestamp,
            signature: { r, s, v },
        };

        console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

        const response = await fetch("https://api.hyperliquid.xyz/exchange", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "x-api-key": apiKey, 
                "x-api-secret": apiSecret 
            },
            body: JSON.stringify(requestBody),
        });

        const responseJson = await response.json();
        console.log("📩 Ответ API:", responseJson);

        if (responseJson.status === "ok") {
            alert(`✅ Успешный вывод: ${amount} USDC`);
            fetchBalance(userAddress); // Обновляем баланс
        } else {
            alert(`❌ Ошибка вывода: ${responseJson.response}`);
        }
    } catch (error) {
        console.error("❌ Ошибка:", error);
        alert("❌ Ошибка при отправке запроса!");
    }
}
