import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "./env.js";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.WEB_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("room:join", (roomId: string) => {
      void socket.join(`room:${roomId}`);
    });

    socket.on("room:leave", (roomId: string) => {
      void socket.leave(`room:${roomId}`);
    });
  });

  return io;
}
