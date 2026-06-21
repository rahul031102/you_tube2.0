// import mongoose from "mongoose";

// const otpSchema = mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "user",
//     required: true,
//   },
//   otp: { type: String, required: true },
//   channel: { type: String, enum: ["email", "sms"], required: true },
//   destination: { type: String },
//   expiresAt: { type: Date, required: true },
//   used: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now },
// });

// // TTL index: documents are removed automatically once expiresAt passes.
// otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// export default mongoose.model("otp", otpSchema);

import mongoose from "mongoose";
 
const otpSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  otp: { type: String, required: false },
  verificationId: { type: String },
  channel: { type: String, enum: ["email", "sms"], required: true },
  destination: { type: String },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
 
// TTL index: documents are removed automatically once expiresAt passes.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
 
export default mongoose.model("otp", otpSchema);
 
