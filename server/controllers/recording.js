import path from "path";
import fs from "fs";
import multer from "multer";
import Call from "../Modals/Call.js";

const recordingsDir = path.join("uploads", "recordings");
try {
  fs.mkdirSync(recordingsDir, { recursive: true });
} catch (e) {}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, recordingsDir);
  },
  filename: function (req, file, cb) {
    const room = req.body.roomId || "unknown";
    const ts = Date.now();
    const ext = path.extname(file.originalname) || ".webm";
    cb(null, `${room}-${ts}${ext}`);
  },
});

export const uploadMiddleware = multer({ storage }).single("recording");

export const handleUpload = (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) return res.status(500).json({ message: "Upload failed" });
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ message: "roomId is required" });
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    try {
      const relPath = path.join("/uploads/recordings", path.basename(file.path));
      const call = await Call.findOneAndUpdate(
        { roomId },
        { recordingAvailable: true, recordingUrl: relPath },
        { new: true }
      );
      return res.status(200).json({ message: "Uploaded", call });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Unable to save recording metadata" });
    }
  });
};
