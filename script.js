document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletButton = document.getElementById("connectWallet");
    const withdrawButton = document.getElementById("withdrawButton");
    const status = document.getElementById("status");
    const walletAddressField = document.getElementById("walletAddress");
    const balanceField = document.getElementById("balance");
    let userAddress = null;

    const API_URL = "https://api.hyperliquid.xyz/exchange";
    const INFO_URL = "https://api.hyperliquid.xyz/info";

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
            userAddress = accounts[0].toLowerCase();
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet connected:", userAddress);

            await fetchBalance(userAddress);
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            status.innerText = "❌ Failed to connect wallet.";
        }
    });

    // 📌 Проверка баланса
    async function fetchBalance(address) {
        console.log("🔍 Получаем баланс для:", address);
        try {
            const response = await fetch(INFO_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "clearinghouseState", user: address }),
            });

            if (!response.ok) {
                throw new Error(`❌ Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log("📩 Баланс Hyperliquid:", data);
            balanceField.innerText = `Balance: ${data.withdrawable} USDC`;
        } catch (error) {
            console.error("❌ Ошибка при получении баланса:", error);
            balanceField.innerText = "Balance: Error";
        }
    }

    // 📌 Проверка API Wallet
    async function checkAPIWalletRegistration(address) {
        console.log("🔍 Проверяем API Wallet:", address);
        try {
            const response = await fetch(INFO_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "clearinghouseState", user: address }),
            });

            if (!response.ok) {
                throw new Error(`❌ Ошибка API: ${response.status}`);
            }

            const data = await response.json();
            console.log("📩 API Wallet статус:", data);
            return data && data.withdrawable !== undefined;
        } catch (error) {
            console.error("❌ Ошибка при проверке API Wallet:", error);
            return false;
        }
    }

    // 📌 Регистрация API Wallet
    async function registerAPIWallet(address) {
        console.log(`📤 Регистрируем API Wallet: ${address}`);

        try {
            const timestamp = Math.floor(Date.now() / 1000);
            const expiry = timestamp + 7 * 24 * 60 * 60;

            const agentAction = {
                type: "ApproveAgent",
                agent: address,
                expiry: expiry,
            };

            const domain = {
                name: "HyperliquidSignTransaction",
                version: "1",
                chainId: 42161,
                verifyingContract: "0x0000000000000000000000000000000000000000",
            };

            const types = {
                ApproveAgent: [
                    { name: "agent", type: "address" },
                    { name: "expiry", type: "uint64" },
                ],
            };

            const signatureRaw = await window.ethereum.request({
                method: "eth_signTypedData_v4",
                params: [address, JSON.stringify({ domain, types, primaryType: "ApproveAgent", message: agentAction })],
            });

            console.log("✅ Подпись для регистрации получена:", signatureRaw);

            const r = signatureRaw.slice(0, 66);
            const s = "0x" + signatureRaw.slice(66, 130);
            const v = parseInt(signatureRaw.slice(130, 132), 16);

            const requestBody = {
                action: agentAction,
                nonce: timestamp,
                signature: { r, s, v },
            };

            console.log("📤 Запрос на регистрацию API Wallet:", JSON.stringify(requestBody, null, 2));

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const responseJson = await response.json();
            console.log("📩 Ответ API на регистрацию API Wallet:", responseJson);

            return responseJson.status === "ok";
        } catch (error) {
            console.error("❌ Ошибка при регистрации API Wallet:", error);
            return false;
        }
    }

    // 📌 Отправка `withdraw3`
    withdrawButton.addEventListener("click", async () => {
        if (!userAddress) {
            status.innerText = "❌ Please connect wallet first!";
            return;
        }

        console.log("🔍 Проверяем регистрацию API Wallet...");
        const isRegistered = await checkAPIWalletRegistration(userAddress);

        if (!isRegistered) {
            console.warn("⚠️ API Wallet не зарегистрирован! Регистрируем...");
            const registrationSuccess = await registerAPIWallet(userAddress);
            if (!registrationSuccess) {
                status.innerText = "❌ Ошибка при регистрации API Wallet!";
                return;
            }
            console.log("✅ API Wallet зарегистрирован! Продолжаем...");
        }

        const amountInput = document.getElementById("amount").value.trim();
        if (!amountInput || amountInput <= 0) {
            status.innerText = "❌ Enter a valid amount!";
            return;
        }

        const amount = parseFloat(amountInput).toFixed(2);
        const timestamp = Date.now();

        const action = {
            type: "withdraw3",
            hyperliquidChain: "Mainnet",
            signatureChainId: "0xa4b1",
            destination: userAddress,
            amount: amount.toString(),
            time: timestamp,
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
                        HyperliquidTransactionWithdraw: [
                            { name: "hyperliquidChain", type: "string" },
                            { name: "signatureChainId", type: "string" },
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

            const r = signatureRaw.slice(0, 66);
            const s = "0x" + signatureRaw.slice(66, 130);
            const v = parseInt(signatureRaw.slice(130, 132), 16);

            const requestBody = {
                action: action,
                nonce: timestamp,
                signature: { r, s, v },
            };

            console.log("📤 Итоговый JSON-запрос:", JSON.stringify(requestBody, null, 2));

            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            const responseJson = await response.json();
            console.log("📩 Ответ API:", responseJson);
        } catch (error) {
            console.error("❌ Ошибка при выводе:", error);
        }
    });
});
