import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const categorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    name: { type: String, required: true, maxlength: 100, trim: true },
    icon_url: { type: String, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

categorySchema.index({ name: 1 });
categorySchema.plugin(softDeletePlugin);

export const Category = mongoose.model("Category", categorySchema);
