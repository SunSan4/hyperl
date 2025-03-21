document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("withdrawButton").addEventListener("click", withdrawFunds);

let userAddress = "";

async function connectWallet() {
    if (!window.ethereum) {
        alert("🦊 Установи MetaMask!");
        return;
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    document.getElementById("walletAddress").innerText = `🔗 Wallet: ${userAddress}`;
    console.log("✅ Wallet connected:", userAddress);

    document.getElementById("withdrawButton").disabled = false;

    await fetchBalance(userAddress);
    await checkAPIWalletRegistration(userAddress);
}

async function checkAPIWalletRegistration(address) {
    console.log("🔍 Проверяем регистрацию API Wallet...");

    try {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "agentRegistered",
                user: address
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`❌ Ошибка API: ${res.status}\n${text}`);
        }

        const data = await res.json();
        console.log("📩 Ответ от API:", data);

        if (!data || !data.registered) {
            console.warn("⚠️ API Wallet не зарегистрирован! Регистрируем...");
            await registerAPIWallet(address);
        } else {
            console.log("✅ API Wallet уже зарегистрирован.");
        }
    } catch (err) {
        console.error("❌ Ошибка при проверке API Wallet:", err);
    }
}

async function registerAPIWallet(agentAddress) {
    const nonce = Date.now();
    const payload = {
        type: "approveAgent",
        hyperliquidChain: "Mainnet",
        signatureChainId: "0xa4b1",
        agentAddress: agentAddress,
        agentName: "MyAgent",
        nonce: nonce
    };

    console.log("📤 Регистрируем API Wallet:", agentAddress);

    const signature = await signTypedData(agentAddress, payload, "ApproveAgent");

    const requestBody = {
        action: payload,
        nonce: nonce,
        signature: signature
    };

    console.log("📤 Запрос на регистрацию API Wallet:", JSON.stringify(requestBody, null, 2));

    try {
        const res = await fetch("https://api.hyperliquid.xyz/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Ошибка регистрации API Wallet: ${res.status} ${text}`);
        }

        const data = await res.json();
        console.log("📩 Ответ на регистрацию:", data);
    } catch (err) {
        console.error("❌ Ошибка при регистрации API Wallet:", err);
    }
}

async function withdrawFunds() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const apiSecret = document.getElementById("apiSecret").value.trim();
    const amount = document.getElementById("amount").value.trim();

    if (!apiKey || !apiSecret || !amount) {
        alert("❗ Введите все данные");
        return;
    }

    const timestamp = Date.now();
    const action = {
        type: "withdraw3",
        hyperliquidChain: "Mainnet",
        signatureChainId: "0xa4b1",
        destination: userAddress,
        amount: amount,
        time: timestamp
    };

    console.log("📤 Данные для подписи: ", action);

    const signature = await signTypedData(userAddress, action, "Withdraw");

    const requestBody = {
        action: action,
        nonce: timestamp,
        signature: signature
    };

    console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

    try {
        const res = await fetch("https://api.hyperliquid.xyz/exchange", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "x-api-secret": apiSecret
            },
            body: JSON.stringify(requestBody)
        });

        const data = await res.json();
        console.log("📩 Ответ API:", data);

        if (data.status === "ok") {
            alert(`✅ Вывод ${amount} USDC успешно отправлен`);
            fetchBalance(userAddress);
        } else {
            alert(`❌ Ошибка: ${data.response}`);
        }
    } catch (err) {
        console.error("❌ Ошибка при выводе:", err);
    }
}

async function signTypedData(from, message, typeName) {
    const domain = {
        name: "HyperliquidSignTransaction",
        version: "1",
        chainId: 42161,
        verifyingContract: "0x0000000000000000000000000000000000000000"
    };

    const types = {
        [typeName]: Object.entries(message).map(([key, val]) => ({
            name: key,
            type: typeof val === "number" ? "uint64" : "string"
        }))
    };

    const data = {
        domain,
        types: {
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" }
            ],
            ...types
        },
        primaryType: typeName,
        message
    };

    const signatureHex = await window.ethereum.request({
        method: "eth_signTypedData_v4",
        params: [from, JSON.stringify(data)]
    });

    console.log("✅ Подпись получена:", signatureHex);

    return {
        r: signatureHex.slice(0, 66),
        s: "0x" + signatureHex.slice(66, 130),
        v: parseInt(signatureHex.slice(130, 132), 16)
    };
}

async function fetchBalance(address) {
    try {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                type: "clearinghouseState",
                user: address
            })
        });

        const data = await res.json();
        const balance = data?.withdrawable || "0.00";
        document.getElementById("balance").innerText = `Balance: ${balance} USDC`;
        console.log("📩 Баланс:", balance);
    } catch (err) {
        console.error("❌ Ошибка при получении баланса:", err);
    }
}
