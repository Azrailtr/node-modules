import config from "./config.js";
import logger from "./logger.js";
import BinanceClient from "./exchange/binance.js";
import BybitClient from "./exchange/bybit.js";
import TelegramNotifier from "./notifications/telegram.js";
import ErrorCoach from "./risk/error-coach.js";
import { decideSignal } from "./strategy/scalper.js";
import { determineTrend } from "./strategy/trend.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ScalperBot {
  constructor(options = config) {
    this.config = options;
    this.tradeExchange = new BinanceClient(options.binance);
    this.marketData = new BybitClient(options.bybit);
    this.notifier = new TelegramNotifier(options.telegram);
    this.errorCoach = new ErrorCoach(options.errorCoach);
    this.position = null;
    this.lastTradeAt = 0;
    this.trend = { bias: "NEUTRAL", reason: "Not initialized" };
    this.lastTrendAt = 0;
  }

  async run() {
    logger.info("Scalper bot started", { symbol: this.config.symbol });
    while (true) {
      try {
        await this.tick();
      } catch (error) {
        logger.error("Tick failed", { message: error.message });
      }
      await sleep(this.config.pollIntervalMs);
    }
  }

  async tick() {
    if (!this.errorCoach.canProceed()) {
      logger.warn("Cooling down after errors", { nextAt: this.errorCoach.nextAllowedAt });
      return;
    }

    const monthlyCloses = await this.safeFetchTrend();
    if (!monthlyCloses) {
      return;
    }

    const closes = await this.safeFetchCloses();
    if (!closes) {
      return;
    }

    const signal = decideSignal({
      closes,
      ...this.config.strategy
    });

    logger.info("Signal", { ...signal, trend: this.trend });

    if (signal.action === "BUY" && this.trend.bias === "UP") {
      await this.tryEnter(closes[closes.length - 1], signal.reason);
    }

    if (signal.action === "SELL" && this.trend.bias === "DOWN") {
      await this.tryExit(closes[closes.length - 1], signal.reason);
    }

    if (this.position) {
      await this.checkRisk(closes[closes.length - 1]);
    }
  }

  async safeFetchTrend() {
    try {
      await this.refreshTrendIfNeeded();
      return true;
    } catch (error) {
      this.errorCoach.recordFailure(error, "monthly-trend");
      return false;
    }
  }

  async safeFetchCloses() {
    try {
      const klines = await this.marketData.getKlines({
        symbol: this.config.symbol,
        interval: this.config.interval,
        limit: 200
      });
      const closes = klines.map((kline) => Number(kline[4] ?? kline[1]));
      if (closes.length === 0 || closes.some((value) => Number.isNaN(value))) {
        throw new Error("Bybit returned invalid kline data");
      }
      this.errorCoach.recordSuccess();
      return closes;
    } catch (error) {
      this.errorCoach.recordFailure(error, "scalp-data");
      return null;
    }
  }

  async refreshTrendIfNeeded() {
    const now = Date.now();
    if (now - this.lastTrendAt < this.config.trend.refreshMs) {
      return;
    }
    const trendKlines = await this.marketData.getKlines({
      symbol: this.config.symbol,
      interval: this.config.trend.interval,
      limit: 120
    });
    const closes = trendKlines.map((kline) => Number(kline[4] ?? kline[1]));
    this.trend = determineTrend(
      closes,
      this.config.trend.fastEma,
      this.config.trend.slowEma
    );
    this.lastTrendAt = now;
    logger.info("Monthly trend", this.trend);
  }

  canTrade() {
    return Date.now() - this.lastTradeAt > this.config.risk.cooldownMs;
  }

  async notifyTrade(message) {
    const response = await this.notifier.sendMessage(message);
    if (!response?.result?.message_id) {
      return;
    }
    const confirmation = await this.notifier.confirmMessage(response.result.message_id);
    const status = confirmation.found ? "✅ Mesaj ulaştı" : "⚠️ Mesaj teyit edilemedi";
    await this.notifier.sendMessage(`${status}: ${message}`);
  }

  async tryEnter(price, reason) {
    if (this.position) {
      logger.warn("Already in position");
      return;
    }
    if (!this.canTrade()) {
      logger.warn("Cooldown active");
      return;
    }

    const quantity = this.config.risk.maxPositionUsdt / price;

    if (this.config.paperMode) {
      this.position = { entry: price, quantity };
      this.lastTradeAt = Date.now();
      logger.info("Paper BUY", { price, quantity, trend: this.trend });
      await this.notifyTrade(
        `Paper BUY ${this.config.symbol} @ ${price.toFixed(2)} (${reason}) Trend: ${this.trend.bias}`
      );
      return;
    }

    const order = await this.tradeExchange.createOrder({
      symbol: this.config.symbol,
      side: "BUY",
      type: "MARKET",
      quantity
    });
    this.position = { entry: price, quantity, orderId: order.orderId };
    this.lastTradeAt = Date.now();
    logger.info("Live BUY", { price, quantity, orderId: order.orderId, trend: this.trend });
    await this.notifyTrade(
      `Live BUY ${this.config.symbol} @ ${price.toFixed(2)} (order ${order.orderId}) Trend: ${this.trend.bias}`
    );
  }

  async tryExit(price, reason) {
    if (!this.position) {
      logger.warn("No position to exit");
      return;
    }
    if (!this.canTrade()) {
      logger.warn("Cooldown active");
      return;
    }

    const pnlPct = ((price - this.position.entry) / this.position.entry) * 100;

    if (this.config.paperMode) {
      logger.info("Paper SELL", { price, pnlPct, trend: this.trend });
      this.position = null;
      this.lastTradeAt = Date.now();
      await this.notifyTrade(
        `Paper SELL ${this.config.symbol} @ ${price.toFixed(2)} (PnL ${pnlPct.toFixed(
          2
        )}%) (${reason}) Trend: ${this.trend.bias}`
      );
      return;
    }

    const order = await this.tradeExchange.createOrder({
      symbol: this.config.symbol,
      side: "SELL",
      type: "MARKET",
      quantity: this.position.quantity
    });
    this.position = null;
    this.lastTradeAt = Date.now();
    logger.info("Live SELL", { price, pnlPct, orderId: order.orderId, trend: this.trend });
    await this.notifyTrade(
      `Live SELL ${this.config.symbol} @ ${price.toFixed(2)} (PnL ${pnlPct.toFixed(
        2
      )}%) order ${order.orderId} Trend: ${this.trend.bias}`
    );
  }

  async checkRisk(price) {
    const { takeProfitPct, stopLossPct } = this.config.risk;
    const changePct = ((price - this.position.entry) / this.position.entry) * 100;

    if (changePct >= takeProfitPct) {
      logger.info("Take profit triggered", { changePct });
      await this.tryExit(price, "Take profit");
      return;
    }

    if (changePct <= -Math.abs(stopLossPct)) {
      logger.warn("Stop loss triggered", { changePct });
      await this.tryExit(price, "Stop loss");
    }
  }
}

export default ScalperBot;
