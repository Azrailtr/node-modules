import logger from "../logger.js";

class ErrorCoach {
  constructor({ baseCooldownMs = 5_000, maxCooldownMs = 60_000 } = {}) {
    this.baseCooldownMs = baseCooldownMs;
    this.maxCooldownMs = maxCooldownMs;
    this.consecutiveErrors = 0;
    this.nextAllowedAt = 0;
    this.lastLesson = null;
  }

  canProceed() {
    return Date.now() >= this.nextAllowedAt;
  }

  recordFailure(error, context = "unknown") {
    this.consecutiveErrors += 1;
    const cooldown = Math.min(
      this.baseCooldownMs * this.consecutiveErrors,
      this.maxCooldownMs
    );
    this.nextAllowedAt = Date.now() + cooldown;
    this.lastLesson = {
      context,
      message: error?.message ?? String(error),
      cooldownMs: cooldown
    };
    logger.warn("Error lesson learned", this.lastLesson);
  }

  recordSuccess() {
    if (this.consecutiveErrors > 0) {
      logger.info("Error streak cleared", { previous: this.consecutiveErrors });
    }
    this.consecutiveErrors = 0;
    this.nextAllowedAt = 0;
    this.lastLesson = null;
  }
}

export default ErrorCoach;
