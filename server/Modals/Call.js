import mongoose from "mongoose";

const callSchema = mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
  durationSeconds: { type: Number },
  recordingAvailable: { type: Boolean, default: false },
});

export default mongoose.model("Call", callSchema);
