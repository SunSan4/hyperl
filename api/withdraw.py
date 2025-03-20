const ccxt = require('ccxt');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { apiKey, apiSecret, amount, destination } = req.body;

        if (!apiKey || !apiSecret || !amount || !destination) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const exchange = new ccxt.hyperliquid({
            apiKey,
            secret: apiSecret
        });

        const withdrawal = await exchange.withdraw("USDC", parseFloat(amount), destination, undefined, { network: 'ARBITRUM' });

        return res.status(200).json({ message: 'Withdraw successful', data: withdrawal });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
