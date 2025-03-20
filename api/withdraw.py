from flask import Flask, request, jsonify
from flask_cors import CORS
import ccxt

app = Flask(__name__)
CORS(app)  # Разрешаем запросы с фронтенда

@app.route('/withdraw', methods=['POST'])
def withdraw():
    data = request.json
    api_key = data.get("apiKey")
    api_secret = data.get("apiSecret")
    amount = float(data.get("amount"))
    destination = data.get("destination")

    if not api_key or not api_secret or not amount or not destination:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        exchange = ccxt.hyperliquid({
            'apiKey': api_key,
            'secret': api_secret
        })

        if not exchange.has['withdraw']:
            return jsonify({"error": "Withdrawals not supported on this exchange"}), 400

        withdrawal = exchange.withdraw("USDC", amount, destination, None, {'network': 'ARBITRUM'})
        
        return jsonify({"message": "Withdraw successful", "data": withdrawal}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
