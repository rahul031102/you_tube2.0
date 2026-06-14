import Call from "../Modals/Call.js";
import mongoose from "mongoose";

export const createCallLog = async ({ roomId, participants = [] }) => {
  try {
    const doc = await Call.create({ roomId, participants });
    return doc;
  } catch (e) {
    console.warn("createCallLog error", e);
    return null;
  }
};

export const endCallLog = async ({ roomId }) => {
  try {
    const call = await Call.findOne({ roomId }).sort({ startedAt: -1 }).exec();
    if (!call) return null;
    call.endedAt = new Date();
    call.durationSeconds = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
    await call.save();
    return call;
  } catch (e) {
    console.warn("endCallLog error", e);
    return null;
  }
};
