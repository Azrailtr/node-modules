import crypto from "crypto";
import logger from "../logger.js";

const createQueryString = (params) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();

const requestWithTimeout = async (url, options = {}, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
};

class BinanceClient {
  constructor({ apiKey, apiSecret, baseUrl }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  async getKlines({ symbol, interval, limit = 200 }) {
    const query = createQueryString({ symbol, interval, limit });
    const url = `${this.baseUrl}/api/v3/klines?${query}`;
    return requestWithTimeout(url);
  }

  async getBookTicker({ symbol }) {
    const query = createQueryString({ symbol });
    const url = `${this.baseUrl}/api/v3/ticker/bookTicker?${query}`;
    return requestWithTimeout(url);
  }

  async getAccountInfo() {
    const params = { timestamp: Date.now() };
    return this.signedRequest("GET", "/api/v3/account", params);
  }

  async createOrder({ symbol, side, type, quantity }) {
    const params = {
      symbol,
      side,
      type,
      quantity,
      timestamp: Date.now()
    };
    return this.signedRequest("POST", "/api/v3/order", params);
  }

  async signedRequest(method, path, params) {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error("Missing Binance API credentials.");
    }
    const query = createQueryString(params);
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(query)
      .digest("hex");
    const url = `${this.baseUrl}${path}?${query}&signature=${signature}`;
    const options = {
      method,
      headers: {
        "X-MBX-APIKEY": this.apiKey
      }
    };
    logger.info("Signed request", { method, path });
    return requestWithTimeout(url, options);
  }
}

export default BinanceClient;
