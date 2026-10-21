import { createServer } from "http";
import pino from "pino";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { createSocketServer, setIo } from "./socket.js";

const logger = pino(
  env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {},
);

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
setIo(io);

function startListening(retriesLeft = 3) {
  httpServer.removeAllListeners("error");
  httpServer.removeAllListeners("listening");

  httpServer.once("listening", () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "API server started");
  });

  httpServer.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && retriesLeft > 0) {
      setTimeout(() => {
        httpServer.close(() => startListening(retriesLeft - 1));
      }, 300);
    } else {
      logger.error(err, "Failed to start server");
      process.exit(1);
    }
  });

  httpServer.listen(env.PORT);
}

startListening();

process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down");
  process.exit(0);
});
process.on("SIGINT", () => process.exit(0));
