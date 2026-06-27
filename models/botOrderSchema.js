import mongoose from "mongoose";

const botOrderSchema = new mongoose.Schema(
  {
    botUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BotUser",
      required: true,
    },
    telegramId: { type: Number, required: true },
    // Savatdagi har bir mahsulot va uning miqdori
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "productToOrder",
          required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        // Buyurtma paytidagi narxni saqlab qo'yamiz
        // (keyin mahsulot narxi o'zgarsa ham tarix to'g'ri qolsin)
        price: { type: Number, required: true, default: 0 },
      },
    ],
    // Butun savat uchun umumiy summa (items asosida hisoblanadi)
    totalPrice: { type: Number, required: true, default: 0 },
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