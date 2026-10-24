import { createServer } from "http";
import pino from "pino";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { createSocketServer, setIo } from "./socket.js";
import { prisma } from "./lib/prisma.js";
import { _expireMatch, scheduleMatchTimer } from "./modules/matches/matches.service.js";

const logger = pino(
  env.NODE_ENV === "development" ? { transport: { target: "pino-pretty" } } : {},
);

const app = createApp();
const httpServer = createServer(app);
const io = createSocketServer(httpServer);
setIo(io);

async function recoverLiveMatches(): Promise<void> {
  const liveMatches = await prisma.match.findMany({
    where: { status: "LIVE" },
    select: { id: true, startedAt: true, elapsedSeconds: true, limitSeconds: true },
  });

  for (const match of liveMatches) {
    const now = Date.now();
    const elapsed = match.elapsedSeconds + Math.floor((now - match.startedAt.getTime()) / 1000);
    if (elapsed >= match.limitSeconds) {
      // Already expired — expire immediately
      void _expireMatch(match.id);
    } else {
      const remainingMs = (match.limitSeconds - elapsed) * 1000;
      scheduleMatchTimer(match.id, remainingMs);
    }
  }
}

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

void recoverLiveMatches()
  .catch((err) => logger.warn({ err }, "recoverLiveMatches failed — starting without recovery"))
  .finally(() => startListening());

process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down");
  process.exit(0);
});
process.on("SIGINT", () => process.exit(0));
