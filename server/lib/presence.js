// simple in-memory presence tracker
export const onlineUsers = new Set();

export function markOnline(userId) {
  if (!userId) return;
  onlineUsers.add(String(userId));
}

export function markOffline(userId) {
  if (!userId) return;
  onlineUsers.delete(String(userId));
}
