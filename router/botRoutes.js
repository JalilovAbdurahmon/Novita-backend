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
      .populate("items.product")
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
      .populate("items.product");
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/bot/order — Mini App dan kelgan zakaz (WebApp)
// Endi savat (bir nechta mahsulot) qabul qilinadi:
// body: { telegramId, items: [{ productId, quantity }], location }
router.post("/order", async (req, res) => {
  try {
    const { telegramId, items, location } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Savat bo'sh" });
    }

    const botUser = await BotUser.findOne({ telegramId, isVerified: true });
    if (!botUser) {
      return res
        .status(403)
        .json({ success: false, message: "Foydalanuvchi topilmadi" });
    }

    // Har bir mahsulotni bazadan tekshirib, joriy narxini olamiz
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.productId));
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Mahsulot topilmadi: ${item.productId}`,
        });
      }
      const quantity = Number(item.quantity) || 0;
      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Miqdor noto'g'ri",
        });
      }
      orderItems.push({
        product: product._id,
        quantity,
        price: product.price || 0,
      });
    }

    const totalPrice = orderItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    const newOrder = new BotOrder({
      botUser: botUser._id,
      telegramId,
      items: orderItems,
      totalPrice,
      location,
    });
    await newOrder.save();

    const populated = await BotOrder.findById(newOrder._id)
      .populate("botUser")
      .populate("items.product");

    res.json({
      success: true,
      message: "Zakaz qabul qilindi",
      data: populated,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/orders/:id", auth, async (req, res) => {
  try {
    const order = await BotOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Zakaz topilmadi" });
    }
    res.json({ success: true, message: "Zakaz o'chirildi", data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;