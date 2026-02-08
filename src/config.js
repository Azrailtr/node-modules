const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }
  return String(value).toLowerCase() === "true";
};

const config = {
  symbol: process.env.SYMBOL ?? "BTCUSDT",
  interval: process.env.INTERVAL ?? "1m",
  paperMode: toBoolean(process.env.PAPER_MODE, true),
  pollIntervalMs: toNumber(process.env.POLL_INTERVAL_MS, 5_000),
  risk: {
    maxPositionUsdt: toNumber(process.env.MAX_POSITION_USDT, 50),
    takeProfitPct: toNumber(process.env.TAKE_PROFIT_PCT, 0.4),
    stopLossPct: toNumber(process.env.STOP_LOSS_PCT, 0.3),
    cooldownMs: toNumber(process.env.COOLDOWN_MS, 20_000)
  },
  strategy: {
    fastEma: toNumber(process.env.FAST_EMA, 5),
    slowEma: toNumber(process.env.SLOW_EMA, 13),
    rsiPeriod: toNumber(process.env.RSI_PERIOD, 14),
    rsiBuy: toNumber(process.env.RSI_BUY, 35),
    rsiSell: toNumber(process.env.RSI_SELL, 65)
  },
  trend: {
    interval: process.env.TREND_INTERVAL ?? "1M",
    fastEma: toNumber(process.env.TREND_FAST_EMA, 6),
    slowEma: toNumber(process.env.TREND_SLOW_EMA, 12),
    refreshMs: toNumber(process.env.TREND_REFRESH_MS, 6 * 60 * 60 * 1000)
  },
  errorCoach: {
    baseCooldownMs: toNumber(process.env.ERROR_COACH_BASE_MS, 5_000),
    maxCooldownMs: toNumber(process.env.ERROR_COACH_MAX_MS, 60_000)
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN ?? "",
    chatId: process.env.TELEGRAM_CHAT_ID ?? ""
  },
  bybit: {
    baseUrl: process.env.BYBIT_BASE_URL ?? "https://api.bybit.com",
    category: process.env.BYBIT_CATEGORY ?? "linear"
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY ?? "",
    apiSecret: process.env.BINANCE_API_SECRET ?? "",
    baseUrl: process.env.BINANCE_BASE_URL ?? "https://api.binance.com"
  }
};

export default config;
