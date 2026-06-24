import express from "express";
import BotUser from "../models/botUserSchema.js";
import BotOrder from "../models/botOrderSchema.js";
import Product from "../models/productsToOrderSchema.js"; // o'zingizning product modeli
import auth from "../middleware/middleware.auth.js";

const router = express.Router();

// GET /api/bot/products — Mini App uchun mahsulotlar
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bot/orders — admin panel uchun
router.get("/orders", auth, async (req, res) => {
  try {
    const orders = await BotOrder.find()
      .populate("botUser")
      .populate("product")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bot/users — admin panel uchun
router.get("/users", auth, async (req, res) => {
  try {
    const users = await BotUser.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/bot/orders/:id/status — statusni o'zgartirish
router.put("/orders/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await BotOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("botUser")
      .populate("product");
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/order — Mini App dan kelgan zakaz (WebApp)
router.post("/order", async (req, res) => {
  try {
    const { telegramId, productId, quantity, location } = req.body;
    const botUser = await BotUser.findOne({ telegramId, isVerified: true });
    if (!botUser) {
      return res
        .status(403)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Mahsulot topilmadi" });
    }
    const newOrder = new BotOrder({
      botUser: botUser._id,
      telegramId,
      product: product._id,
      quantity,
      location,
    });
    await newOrder.save();
    res.json({ success: true, message: "Zakaz qabul qilindi", data: newOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
