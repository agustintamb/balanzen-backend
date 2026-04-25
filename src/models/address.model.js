import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const addressSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    user_id: { type: String, required: true, ref: "User" },
    formatted_address: { type: String, required: true, maxlength: 200 },
    street: { type: String, required: true, maxlength: 100 },
    number: { type: String, required: true, maxlength: 10 },
    city: { type: String, required: true, maxlength: 100 },
    province: { type: String, required: true, maxlength: 100 },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    is_selected: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

addressSchema.index({ user_id: 1 });
addressSchema.index({ user_id: 1, is_selected: 1 });
addressSchema.plugin(softDeletePlugin);

export const Address = mongoose.model("Address", addressSchema);
