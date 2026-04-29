import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const favoriteSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    user_id: { type: String, required: true, ref: "User" },
    publication_id: { type: String, required: true, ref: "Publication" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: false } }
);

favoriteSchema.index({ user_id: 1, publication_id: 1 }, { unique: true });

favoriteSchema.plugin(softDeletePlugin);

export const Favorite = mongoose.model("Favorite", favoriteSchema);
