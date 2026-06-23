import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let lastToken: string | null = null;

export function getSocket(): Socket {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // if token changed (e.g. user logged in), destroy old socket and reconnect
  if (socket && token !== lastToken) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    const url = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    lastToken = token;
    socket = io(url, {
      transports: ["websocket"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}