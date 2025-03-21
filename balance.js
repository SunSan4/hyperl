<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hyperliquid Withdraw</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/web3/1.7.5/web3.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    <script defer src="/scripts/script.js"></script>
    <script defer src="/scripts/balance.js"></script>
</head>
<body>
    <h2>Hyperliquid Withdraw</h2>

    <label>API Key:</label><input type="text" id="apiKey"><br><br>
    <label>API Secret:</label><input type="text" id="apiSecret"><br><br>
    <label>Amount (USDC):</label><input type="number" id="amount" min="1"><br><br>

    <button id="connectWallet">Connect Wallet</button>
    <p id="walletAddress">Wallet: Not Connected</p>
    <p id="balance">Balance: Loading...</p>

    <button id="withdrawButton" disabled>Withdraw</button>
    <p id="status"></p>
</body>
</html>
