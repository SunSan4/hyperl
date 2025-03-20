from flask import Flask, request, jsonify
import ccxt
import os
from dotenv import load_dotenv

app = Flask(__name__)

# Загружаем переменные окружения
load_dotenv()

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
        # Подключаемся к Hyperliquid через CCXT
        exchange = ccxt.hyperliquid({
            'apiKey': api_key,
            'secret': api_secret
        })

        # Проверяем, поддерживает ли биржа вывод
        if not exchange.has['withdraw']:
            return jsonify({"error": "Withdrawals not supported on this exchange"}), 400

        # Выполняем вывод
        withdrawal = exchange.withdraw("USDC", amount, destination, None, {'network': 'ARBITRUM'})
        
        return jsonify({"message": "Withdraw successful", "data": withdrawal}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
