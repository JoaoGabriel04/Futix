import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL!, {
      autoConnect: false,
      auth: (cb: (data: { token: string }) => void) => {
        fetch("/api/auth/socket-token")
          .then((res) => (res.ok ? (res.json() as Promise<{ token?: string }>) : Promise.resolve({ token: "" })))
          .then((data) => cb({ token: data.token ?? "" }))
          .catch(() => cb({ token: "" }));
      },
    });
  }
  return socket;
}
