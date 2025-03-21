async function fetchBalance(address) {
    console.log("📤 Запрашиваем баланс для:", address);

    try {
        const response = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "clearinghouseState", user: address }),
        });

        const data = await response.json();
        console.log("📩 Баланс Hyperliquid:", data);

        if (data.withdrawable) {
            document.getElementById("balance").innerText = `💰 Доступно: ${data.withdrawable} USDC`;
        } else {
            document.getElementById("balance").innerText = "⚠ Баланс недоступен!";
        }
    } catch (error) {
        console.error("❌ Ошибка при получении баланса:", error);
        document.getElementById("balance").innerText = "❌ Ошибка загрузки!";
    }
}
