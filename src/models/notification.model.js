import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const notificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    user_id: { type: String, required: true, ref: "User" },
    type: {
      type: String,
      required: true,
      enum: [
        "NEW_RESERVATION",
        "RESERVATION_CANCELLED_BY_CONSUMER",
        "RESERVATION_CANCELLED_BY_COMMERCE",
        "ORDER_DELIVERED",
        "NEW_MESSAGE",
        "PUBLICATION_EXPIRING",
        "PUBLICATION_EXPIRED",
      ],
    },
    title: { type: String, required: true, maxlength: 100 },
    message: { type: String, required: true, maxlength: 300 },
    reference_id: { type: String, default: null },
    reference_type: { type: String, enum: ["PUBLICATION", "ORDER"], default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

notificationSchema.index({ user_id: 1 });
notificationSchema.index({ user_id: 1, read: 1 });

notificationSchema.plugin(softDeletePlugin);

export const Notification = mongoose.model("Notification", notificationSchema);
