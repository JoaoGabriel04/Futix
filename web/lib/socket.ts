import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Get or create the Socket.IO client instance.
 * Lazy initialization: only creates the socket on first call.
 * Uses withCredentials to send the httpOnly access_token cookie.
 * Does not auto-connect; must be explicitly connected via socket.connect().
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}
