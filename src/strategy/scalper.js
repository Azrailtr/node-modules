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

const rsi = (values, period) => {
  if (values.length <= period) {
    return null;
  }
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < values.length; i += 1) {
    const change = values[i] - values[i - 1];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
  }
  if (avgLoss === 0) {
    return 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
};

const decideSignal = ({ closes, fastEma, slowEma, rsiPeriod, rsiBuy, rsiSell }) => {
  const fast = ema(closes, fastEma);
  const slow = ema(closes, slowEma);
  const rsiValue = rsi(closes, rsiPeriod);

  if (fast === null || slow === null || rsiValue === null) {
    return { action: "HOLD", reason: "Insufficient data" };
  }

  if (fast > slow && rsiValue <= rsiBuy) {
    return { action: "BUY", reason: "Momentum + RSI dip", meta: { fast, slow, rsiValue } };
  }

  if (fast < slow && rsiValue >= rsiSell) {
    return { action: "SELL", reason: "Momentum loss + RSI spike", meta: { fast, slow, rsiValue } };
  }

  return { action: "HOLD", reason: "No edge", meta: { fast, slow, rsiValue } };
};

export { decideSignal };
