import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const orderSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    publication_id: { type: String, required: true, ref: "Publication" },
    consumer_id: { type: String, required: true, ref: "User" },
    commerce_id: { type: String, required: true, ref: "User" },
    status: {
      type: String,
      required: true,
      enum: ["RESERVED", "DELIVERED", "CANCELLED"],
      default: "RESERVED",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

orderSchema.index({ publication_id: 1 });
orderSchema.index({ consumer_id: 1 });
orderSchema.index({ commerce_id: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ publication_id: 1, status: 1 });

orderSchema.plugin(softDeletePlugin);

export const Order = mongoose.model("Order", orderSchema);
