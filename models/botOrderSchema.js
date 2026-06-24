import mongoose from "mongoose";

const botOrderSchema = new mongoose.Schema(
  {
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BotUser",
      required: true,
    },
    telegramId: { type: Number, required: true },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true, min: 1 },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    status: {
      type: String,
      enum: ["new", "accepted", "delivered", "cancelled"],
      default: "new",
    },
    note: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("BotOrder", botOrderSchema);
