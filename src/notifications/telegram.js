import logger from "../logger.js";

const requestWithTimeout = async (url, options = {}, timeoutMs = 10_000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json();
    if (!response.ok || !data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
};

class TelegramNotifier {
  constructor({ token, chatId }) {
    this.token = token;
    this.chatId = chatId;
    this.baseUrl = token ? `https://api.telegram.org/bot${token}` : "";
  }

  isEnabled() {
    return Boolean(this.token && this.chatId);
  }

  async sendMessage(text) {
    if (!this.isEnabled()) {
      logger.warn("Telegram not configured");
      return { ok: false, skipped: true };
    }
    const url = `${this.baseUrl}/sendMessage`;
    const payload = {
      chat_id: this.chatId,
      text
    };
    return requestWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async confirmMessage(messageId) {
    if (!this.isEnabled()) {
      return { ok: false, skipped: true };
    }
    const url = `${this.baseUrl}/getUpdates?limit=20`;
    const data = await requestWithTimeout(url);
    const found = data.result?.some((update) => update.message?.message_id === messageId);
    return { ok: true, found: Boolean(found) };
  }
}

export default TelegramNotifier;
