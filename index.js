import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import order from "./router/order.js";
import user from "./router/user.js";
import productsOrder from "./router/productsToOrder.js";
import shopName from "./router/shopName.js";
import tradeAgent from "./router/tradeAgent.js";
import botRoutes from "./router/botRoutes.js";
import { initTelegramBot } from "./telegramBot.js";
import { initTaBot } from "./taBot.js";
import { initClientBot } from "./telegramClientBot.js";

let app = express();

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(order);
app.use(user);
app.use(productsOrder);
app.use(shopName);
app.use(tradeAgent);
app.use("/api/bot", botRoutes);

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    console.log("✅ MongoDB connected");
    initTelegramBot();
    initTaBot();
    initClientBot();
  })
  .catch((err) => {
    console.log("❌ MongoDB doesn't connected");
    console.log(err.message);
  });

app.listen(process.env.PORT, () => {
  console.log("Server ishladi ..");
});
