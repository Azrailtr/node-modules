import config from "./config.js";
import logger from "./logger.js";
import ScalperBot from "./bot.js";

const bot = new ScalperBot(config);

bot.run().catch((error) => {
  logger.error("Fatal error", { message: error.message });
  process.exitCode = 1;
});
