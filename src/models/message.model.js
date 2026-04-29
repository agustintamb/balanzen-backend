import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const messageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    order_id: { type: String, required: true, ref: "Order" },
    sender_id: { type: String, required: true, ref: "User" },
    content: { type: String, required: true, maxlength: 1000, trim: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

messageSchema.index({ order_id: 1 });
messageSchema.index({ order_id: 1, created_at: 1 });

messageSchema.plugin(softDeletePlugin);

export const Message = mongoose.model("Message", messageSchema);
