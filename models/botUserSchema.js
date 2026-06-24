import mongoose from "mongoose";

const botUserSchema = new mongoose.Schema(
  {
    telegramId: { type: Number, required: true, unique: true },
    firstName: { type: String },
    lastName: { type: String },
    username: { type: String },
    fullName: { type: String }, // /start da kiritilgan ism
    phone: { type: String },
    lang: { type: String, enum: ["uz", "ru"], default: "uz" },
    isVerified: { type: Boolean, default: false }, // phone yuborilgandan keyin true
    step: {
      type: String,
      enum: ["start", "lang", "name", "phone", "done"],
      default: "start",
    },
  },
  { timestamps: true }
);

export default mongoose.model("BotUser", botUserSchema);
