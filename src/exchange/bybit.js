import logger from "../logger.js";

const requestWithTimeout = async (url, options = {}, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || data.retCode !== 0) {
      throw new Error(`Bybit API error: ${JSON.stringify(data)}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

class BybitClient {
  constructor({ baseUrl, category }) {
    this.baseUrl = baseUrl;
    this.category = category;
  }

  async getKlines({ symbol, interval, limit = 200 }) {
    const query = new URLSearchParams({
      category: this.category,
      symbol,
      interval,
      limit: String(limit)
    }).toString();
    const url = `${this.baseUrl}/v5/market/kline?${query}`;
    logger.info("Bybit klines", { symbol, interval, limit });
    const data = await requestWithTimeout(url);
    return data.result?.list ?? [];
  }
}

export default BybitClient;
