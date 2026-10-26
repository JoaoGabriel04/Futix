import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifySocketToken } from "./lib/jwt.js";
import { env } from "./env.js";
import { prisma } from "./lib/prisma.js";

// ── socket server ──────────────────────────────────────────────────────────────

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEB_URL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token as unknown;
      if (typeof token !== "string" || token.length === 0) {
        const error = new Error("Token não encontrado.") as Error & {
          status: number;
          code: string;
        };
        error.status = 401;
        error.code = "UNAUTHORIZED";
        return next(error);
      }
      const { userId } = verifySocketToken(token);
      socket.data.userId = userId;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on("connection", (socket) => {
    /**
     * Join a room for receiving updates.
     * Validates that the user is a member or organizer of the room.
     * Emits "error" if the user is not authorized.
     */
    socket.on("room:join", async (roomId: string) => {
      try {
        const userId = socket.data.userId as string;

        // Validate that userId is a member or organizer of the room
        const member = await prisma.roomMember.findFirst({
          where: { roomId, userId },
          select: { id: true, role: true },
        });

        const isOwner = await prisma.room.findFirst({
          where: { id: roomId, ownerId: userId },
          select: { id: true },
        });

        if (!member && !isOwner) {
          socket.emit("error", { code: "FORBIDDEN" });
          return;
        }

        void socket.join(`room:${roomId}`);
      } catch (_err) {
        socket.emit("error", { code: "INTERNAL_SERVER_ERROR" });
      }
    });

    /**
     * Leave a room.
     */
    socket.on("room:leave", (roomId: string) => {
      void socket.leave(`room:${roomId}`);
    });
  });

  return io;
}

/**
 * Export the io instance for use in controllers/services.
 * Allows emitting events to specific rooms.
 *
 * Usage (in members service/controller):
 *   io.to(`room:${roomId}`).emit("member:requested", { memberId, status: "PENDING" });
 *   io.to(`room:${roomId}`).emit("member:updated", { memberId, status: "CONFIRMED" });
 *   io.to(`room:${roomId}`).emit("room:updated", { roomId, status: "LOCKED" });
 */
let io: Server;

export function setIo(server: Server): void {
  io = server;
}

export function getIo(): Server {
  if (!io) {
    throw new Error("Socket.IO server not initialized. Call setIo() first.");
  }
  return io;
}
