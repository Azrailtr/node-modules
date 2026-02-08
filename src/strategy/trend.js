const ema = (values, period) => {
  if (values.length < period) {
    return null;
  }
  const k = 2 / (period + 1);
  let emaValue = values.slice(0, period).reduce((sum, v) => sum + v, 0) / period;
  for (const value of values.slice(period)) {
    emaValue = value * k + emaValue * (1 - k);
  }
  return emaValue;
};

const determineTrend = (closes, fastPeriod = 6, slowPeriod = 12) => {
  const fast = ema(closes, fastPeriod);
  const slow = ema(closes, slowPeriod);
  if (fast === null || slow === null) {
    return { bias: "NEUTRAL", reason: "Insufficient data" };
  }
  if (fast > slow) {
    return { bias: "UP", reason: "Monthly EMA uptrend" };
  }
  if (fast < slow) {
    return { bias: "DOWN", reason: "Monthly EMA downtrend" };
  }
  return { bias: "NEUTRAL", reason: "Monthly EMA flat" };
};

export { determineTrend };
