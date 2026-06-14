import mongoose from "mongoose";
import { generateId } from "#utils/uuid.helper.js";

const chatReadSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    user_id: { type: String, required: true, ref: "User" },
    order_id: { type: String, required: true, ref: "Order" },
    last_read_at: { type: Date, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

chatReadSchema.index({ user_id: 1, order_id: 1 }, { unique: true });

export const ChatRead = mongoose.model("ChatRead", chatReadSchema);
