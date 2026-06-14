import express from "express";
import { handleUpload } from "../controllers/recording.js";
const router = express.Router();

router.post("/recording", handleUpload);

export default router;
