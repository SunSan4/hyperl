
document.getElementById("connectWallet").addEventListener("click", connectWallet);
document.getElementById("withdrawButton").addEventListener("click", withdrawFunds);

let userAddress = "";

async function connectWallet() {
    if (!window.ethereum) return alert("🦊 Установи MetaMask!");

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    userAddress = accounts[0];
    document.getElementById("walletAddress").innerText = `🔗 Wallet: ${userAddress}`;
    document.getElementById("withdrawButton").disabled = false;
    fetchBalance(userAddress);
}

async function withdrawFunds() {
    const apiKey = document.getElementById("apiKey").value.trim();
    const apiSecret = document.getElementById("apiSecret").value.trim();
    const amount = document.getElementById("amount").value.trim();

    if (!apiKey || !apiSecret || !amount || !userAddress) {
        return alert("❗ Заполни все поля");
    }

    const timestamp = Date.now();
    const action = {
        type: "withdraw3",
        hyperliquidChain: "Mainnet",
        signatureChainId: "0x66eee",
        destination: userAddress,
        amount: amount,
        time: timestamp
    };

    const signature = await signTypedData(userAddress, action, "Withdraw");

    const body = {
        apiKey,
        apiSecret,
        walletAddress: userAddress,
        amount,
        signature
    };

    const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.status === "ok") {
        alert(`✅ Успешно выведено ${amount} USDC`);
        fetchBalance(userAddress);
    } else {
        alert(`❌ Ошибка: ${data.error || JSON.stringify(data)}`);
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

    return {
        r: signatureHex.slice(0, 66),
        s: "0x" + signatureHex.slice(66, 130),
        v: parseInt(signatureHex.slice(130, 132), 16)
    };
}
