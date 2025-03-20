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
            if (!userAddress || userAddress.length !== 42) {
                throw new Error("❌ Invalid Ethereum address detected!");
            }

            const timestamp = Date.now();

            // Приводим `destination` к точному виду, как в CCXT
            const formattedDestination = ethers.utils.getAddress(userAddress);

            // Формируем данные для подписи (аналогично CCXT)
            const action = {
                hyperliquidChain: "Mainnet",
                signatureChainId: "0x66eee",
                destination: formattedDestination, // ✅ Теперь адрес совпадает с CCXT
                amount: amount.toString(),
                time: timestamp,
                type: "withdraw3"
            };

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

            const r = "0x" + signatureRaw.slice(2, 66);
            const s = "0x" + signatureRaw.slice(66, 130);
            const v = parseInt(signatureRaw.slice(130, 132), 16);

            const requestBody = {
                action,
                nonce: timestamp,
                signature: { r, s, v }
            };

            console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

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
            console.log("📩 Ответ от API:", responseText);
        } catch (error) {
            console.error("❌ Ошибка при выводе:", error);
        }
    });
});
