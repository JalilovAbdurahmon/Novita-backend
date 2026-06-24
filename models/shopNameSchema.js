import mongoose from "mongoose";

let ShopSchema = mongoose.Schema(
  {
    shopName: {
      type: String,
      required: [true, "Do'kon nomi kiritilishi shart!"],
      unique: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: [true, "Do'kon egasining ismi kiritilishi shart!"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Telefon raqami kiritilishi shart!"],
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    telegramChatId: {
      type: String,
      default: null,
    },
    addedByAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "tradeAgent",
      default: null,
    },
    preferredLang: {
      type: String,
      enum: ["uz", "ru"],
      default: "uz",
    },
  },
  {
    timestamps: true,
  }
);

let Shop = mongoose.model("shop", ShopSchema);

export default Shop;
