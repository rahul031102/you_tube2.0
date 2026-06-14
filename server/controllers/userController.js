import users from "../Modals/Auth.js";
import jwt from "jsonwebtoken";
import { onlineUsers } from "../lib/presence.js";

export const listUsers = async (req, res) => {
  try {
    let excludeId = req.query.excludeId;
    // try to derive from auth header
    const auth = req.headers.authorization;
    if (!excludeId && auth && auth.startsWith("Bearer ")) {
      try {
        const token = auth.split(" ")[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (payload && payload.id) excludeId = payload.id;
      } catch (e) {
        // ignore
      }
    }

    const q = excludeId ? { _id: { $ne: excludeId } } : {};
    const list = await users.find(q).select("_id name image channelname").lean();
    const enriched = list.map((u) => ({
      _id: u._id,
      name: u.name || u.channelname || "Unknown",
      channelname: u.channelname || u.name || "",
      image: u.image || null,
      online: onlineUsers.has(String(u._id)),
    }));
    return res.status(200).json(enriched);
  } catch (e) {
    console.error("listUsers error", e);
    return res.status(500).json({ message: "Unable to fetch users" });
  }
};
