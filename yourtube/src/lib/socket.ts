import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    const url = typeof window !== "undefined" && (window as any).NEXT_PUBLIC_SIGNALING_URL
      ? (window as any).NEXT_PUBLIC_SIGNALING_URL
      : process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      // : process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:5000";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    socket = io(url, { transports: ["websocket"], auth: { token } });
  }
  return socket;
}
