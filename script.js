document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletButton = document.getElementById("connectWallet");
    const withdrawButton = document.getElementById("withdrawButton");
    const status = document.getElementById("status");
    const walletAddressField = document.getElementById("walletAddress");
    let userAddress = null;

    // ✅ Проверяем HTTPS
    if (location.protocol !== 'https:') {
        location.replace(`https:${location.href.substring(location.protocol.length)}`);
    }

    // ✅ Подключаем Web3
    if (typeof window.ethereum !== "undefined") {
        console.log("✅ MetaMask detected");
        window.web3 = new Web3(window.ethereum); // ✅ Создаём web3 вручную
    } else {
        console.error("❌ MetaMask not detected");
        status.innerText = "❌ MetaMask not detected. Please install it.";
        return;
    }

    // 🔹 Подключение MetaMask
    connectWalletButton.addEventListener("click", async () => {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            userAddress = accounts[0];
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet connected:", userAddress);
        } catch (error) {
            console.error("❌ Wallet connection failed:", error);
            status.innerText = `❌ MetaMask connection failed: ${error.message}`;
        }
    });

    // 🔹 Проверяем аккаунты
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            console.log("🔴 Disconnected from MetaMask");
            status.innerText = "❌ Wallet disconnected!";
            userAddress = null;
            withdrawButton.disabled = true;
        } else {
            userAddress = accounts[0];
            walletAddressField.innerText = `Wallet: ${userAddress}`;
            withdrawButton.disabled = false;
            console.log("✅ Wallet switched:", userAddress);
        }
    });

    // 🔹 Проверяем сеть (должна быть Arbitrum)
    window.ethereum.on("chainChanged", (chainId) => {
        console.log("🔗 Chain changed:", chainId);
        if (chainId !== "0xa4b1") {
            status.innerText = "⚠️ Switch to Arbitrum Network in MetaMask!";
        }
    });
});
