import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    email: {
      type: String,
      required: true,
      unique: true,
      maxlength: 100,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, required: true, enum: ["CONSUMIDOR", "COMERCIO", "ADMIN"] },
    first_name: { type: String, required: true, maxlength: 50, trim: true },
    last_name: { type: String, required: true, maxlength: 50, trim: true },
    phone: { type: String, required: true, maxlength: 20, trim: true },
    dni: { type: String, required: true, maxlength: 15, trim: true },
    photo_url: { type: String, default: null },
    // Solo COMERCIO
    business_name: { type: String, maxlength: 100, trim: true, default: null },
    cuit: { type: String, maxlength: 15, trim: true, default: null },
    description: { type: String, maxlength: 500, default: null },
    // Almacena el refresh token activo para invalidar en logout
    refresh_token: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

userSchema.index({ role: 1 });
userSchema.plugin(softDeletePlugin);

export const User = mongoose.model("User", userSchema);
