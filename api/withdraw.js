// api/withdraw.js
import ccxt from 'ccxt';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { apiKey, apiSecret, walletAddress, amount, signature } = req.body;

        const exchange = new ccxt.hyperliquid({
            apiKey,
            secret: apiSecret,
            walletAddress,
            verbose: true,
        });

        const nonce = Date.now();
        const action = {
            type: 'withdraw3',
            hyperliquidChain: 'Mainnet',
            signatureChainId: '0x66eee',
            destination: walletAddress,
            amount: String(amount),
            time: nonce,
        };

        const payload = {
            action,
            nonce,
            signature,
        };

        const result = await exchange.privatePostExchange(payload);
        return res.status(200).json(result);
    } catch (err) {
        console.error('❌ Withdraw Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
