import mongoose from "mongoose";
import { softDeletePlugin } from "#middlewares/soft-delete.plugin.js";
import { generateId } from "#utils/uuid.helper.js";

const publicationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: generateId },
    commerce_id: { type: String, required: true, ref: "User" },
    title: { type: String, required: true, maxlength: 100, trim: true },
    description: { type: String, required: true, maxlength: 500, trim: true },
    original_price: { type: Number, required: true, min: 0 },
    final_price: { type: Number, required: true, min: 0 },
    expiry_date: { type: Date, required: true },
    category_id: { type: String, required: true, ref: "Category" },
    photos: { type: [String], default: [], validate: (v) => v.length <= 5 },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "RESERVED", "DELIVERED", "CANCELLED", "EXPIRED"],
      default: "ACTIVE",
    },
    is_donation: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

publicationSchema.index({ commerce_id: 1 });
publicationSchema.index({ status: 1 });
publicationSchema.index({ category_id: 1 });
publicationSchema.index({ expiry_date: 1 });

publicationSchema.virtual("discount_pct").get(function () {
  // Sin precio original (donación gratuita o 0): sin descuento y evita división por cero
  if (!this.original_price) return 0;
  if (this.is_donation) return 100;
  return Math.round((1 - this.final_price / this.original_price) * 100);
});

publicationSchema.plugin(softDeletePlugin);

export const Publication = mongoose.model("Publication", publicationSchema);
