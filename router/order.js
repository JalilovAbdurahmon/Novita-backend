import express from "express";
import Order from "../models/orderSchema.js";
import Shop from "../models/shopNameSchema.js";
import auth from "../middleware/middleware.auth.js";
import { getBotInstance } from "../telegramBot.js";

let route = express.Router();

const normalizePhone = (raw) => String(raw || "").replace(/\D/g, "");

const findShopForOrder = async (order) => {
  if (order.shopId) {
    const shop = await Shop.findById(order.shopId);
    if (shop) return shop;
  }
  const orderPhoneDigits = normalizePhone(order.phone);
  if (!orderPhoneDigits) return null;
  const shops = await Shop.find();
  return (
    shops.find((shop) => {
      const shopPhoneDigits = normalizePhone(shop.phone);
      return (
        shopPhoneDigits === orderPhoneDigits ||
        orderPhoneDigits.endsWith(shopPhoneDigits) ||
        shopPhoneDigits.endsWith(orderPhoneDigits)
      );
    }) || null
  );
};

// Shu yildagi barcha "berildi" orderlarni completedAt tartibida
// 1 dan boshlab qayta raqamlaydi.
// Yangi yakunlanganda YOKI bitta o'chirilganda chaqiriladi.
// Misol: 3 ta bor (1,2,3), 2-chisini o'chirasan => 1,3 qoladi =>
// reorder => 1,2 bo'ladi. Bo'shliq yo'q.
const reorderReceiptNumbers = async (year) => {
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const orders = await Order.find({
    status: "berildi",
    completedAt: { $gte: startOfYear, $lt: endOfYear },
  }).sort({ completedAt: 1 }); // eng eski birinchi

  await Promise.all(
    orders.map((o, idx) =>
      Order.updateOne(
        { _id: o._id },
        { receiptNumber: idx + 1, receiptYear: year }
      )
    )
  );
};

// 1. ZAKAZ YARATISH (POST)
route.post("/order", auth, async (req, res) => {
  try {
    const { shopName, ownerName, phone, product, quantity, district, location } = req.body;
    const cleanOwnerName = (ownerName || "").trim();
    const orderPhoneDigits = normalizePhone(phone);
    let matchedShop = null;
    if (orderPhoneDigits) {
      const shops = await Shop.find();
      matchedShop =
        shops.find((shop) => {
          const shopPhoneDigits = normalizePhone(shop.phone);
          return (
            shopPhoneDigits === orderPhoneDigits ||
            orderPhoneDigits.endsWith(shopPhoneDigits) ||
            shopPhoneDigits.endsWith(orderPhoneDigits)
          );
        }) || null;
    }
    const newOrder = new Order({
      shopName,
      ownerName: cleanOwnerName,
      shopId: matchedShop ? matchedShop._id : null,
      phone,
      product,
      quantity,
      district,
      location,
    });
    const savedOrder = await newOrder.save();
    res.status(201).json({ success: true, message: "Zakaz muvaffaqiyatli yaratildi!", data: savedOrder });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. AKTIV ZAKAZLARNI OLISH (GET /active)
route.get("/active", auth, async (req, res) => {
  try {
    const activeOrders = await Order.find({ status: "berilmoqda" })
      .populate("product")
      .populate("agentId", "name phone")
      .sort({ createdAt: -1 });
    res.status(200).json(activeOrders);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. TARIXNI OLISH (GET /history)
route.get("/history", auth, async (req, res) => {
  try {
    const allOrders = await Order.find()
      .populate("product")
      .populate("agentId", "name phone")
      .sort({ createdAt: -1 });
    res.status(200).json(allOrders);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. ZAKAZNI YAKUNLASH (PUT /:id/complete)
route.put("/:id/complete", auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const completedAt = new Date();
    const receiptYear = completedAt.getFullYear();

    // Avval statusni o'zgartiramiz (receiptNumber vaqtincha null)
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: "berildi", completedAt, receiptYear, receiptNumber: null },
      { new: true }
    ).populate("product");

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: "Zakaz topilmadi!" });
    }

    // Shu yil uchun barcha chek raqamlarini completedAt tartibida qayta yozadi.
    // Yangi yakunlangan order ham kiradi => unga to'g'ri raqam beriladi.
    await reorderReceiptNumbers(receiptYear);

    // Qayta o'qib yangilangan receiptNumber bilan qaytaramiz
    const finalOrder = await Order.findById(orderId).populate("product");

    res.status(200).json({
      success: true,
      message: "Zakaz statusi 'berildi'ga o'zgardi!",
      data: finalOrder,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. TARIXNI TO'LIQ TOZALASH (DELETE /history)
route.delete("/history", auth, async (req, res) => {
  try {
    const result = await Order.deleteMany({ status: "berildi" });
    res.status(200).json({ success: true, message: "Tarix muvaffaqiyatli tozalandi!", deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 6. BITTA ZAKAZNI O'CHIRISH (DELETE /:id)
route.delete("/:id", auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const deletedOrder = await Order.findByIdAndDelete(orderId);

    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: "Zakaz topilmadi!" });
    }

    // Agar o'chirilgan "berildi" bo'lsa — shu yil uchun qayta tartiblash
    if (deletedOrder.status === "berildi" && deletedOrder.completedAt) {
      const year = new Date(deletedOrder.completedAt).getFullYear();
      await reorderReceiptNumbers(year);
    }

    res.status(200).json({ success: true, message: "Zakaz muvaffaqiyatli o'chirildi!", data: deletedOrder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 7. MARSHRUTNI OPTIMALLASHTIRISH (POST /route-optimize)
route.post("/route-optimize", auth, async (req, res) => {
  try {
    const { origin, orderIds } = req.body;
    if (!origin || typeof origin.lat !== "number" || typeof origin.lng !== "number") {
      return res.status(400).json({ success: false, message: "origin (lat, lng) talab qilinadi" });
    }
    let stopsQuery = { status: "berilmoqda" };
    if (Array.isArray(orderIds) && orderIds.length > 0) {
      stopsQuery = { _id: { $in: orderIds } };
    }
    const stopOrders = await Order.find(stopsQuery).populate("product");
    if (stopOrders.length === 0) {
      return res.status(400).json({ success: false, message: "Tarqatish uchun aktiv buyurtmalar topilmadi" });
    }
    const allPoints = [
      { lat: origin.lat, lng: origin.lng },
      ...stopOrders.map((o) => ({ lat: o.location.lat, lng: o.location.lng })),
    ];
    const coordsStr = allPoints.map((p) => `${p.lng},${p.lat}`).join(";");
    const osrmUrl = `https://router.project-osrm.org/table/v1/driving/${coordsStr}?annotations=distance,duration`;
    const osrmResponse = await fetch(osrmUrl);
    const osrmData = await osrmResponse.json();
    if (osrmData.code !== "Ok") {
      return res.status(502).json({ success: false, message: "OSRM xizmatidan xato javob keldi", detail: osrmData.code });
    }
    const { distances, durations } = osrmData;
    const n = allPoints.length;
    const visited = new Array(n).fill(false);
    visited[0] = true;
    let currentIndex = 0;
    const orderedIndices = [];
    const legs = [];
    let totalDistanceMeters = 0;
    let totalDurationSeconds = 0;
    for (let step = 0; step < n - 1; step++) {
      let bestIndex = -1;
      let bestDuration = Infinity;
      for (let j = 1; j < n; j++) {
        if (visited[j]) continue;
        const duration = durations[currentIndex][j];
        if (duration != null && duration < bestDuration) {
          bestDuration = duration;
          bestIndex = j;
        }
      }
      if (bestIndex === -1) break;
      visited[bestIndex] = true;
      legs.push({
        fromOrderId: currentIndex === 0 ? null : stopOrders[currentIndex - 1]._id,
        toOrderId: stopOrders[bestIndex - 1]._id,
        distanceMeters: distances[currentIndex][bestIndex],
        durationSeconds: durations[currentIndex][bestIndex],
      });
      totalDistanceMeters += distances[currentIndex][bestIndex] || 0;
      totalDurationSeconds += durations[currentIndex][bestIndex] || 0;
      orderedIndices.push(bestIndex - 1);
      currentIndex = bestIndex;
    }
    const orderedStops = orderedIndices.map((idx) => stopOrders[idx]);
    res.status(200).json({ success: true, origin, orderedStops, legs, totalDistanceMeters, totalDurationSeconds });
  } catch (err) {
    console.error("Route optimize xatosi:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 8. CHEKNI TELEGRAM ORQALI YUBORISH (POST /:id/send-receipt)
route.post("/:id/send-receipt", auth, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "Rasm (imageBase64) yuborilmadi" });
    }
    const order = await Order.findById(orderId).populate("product");
    if (!order) {
      return res.status(404).json({ success: false, message: "Zakaz topilmadi!" });
    }
    const shop = await findShopForOrder(order);
    if (!shop) {
      return res.status(400).json({ success: false, message: `"${order.ownerName}" nomli do'kon topilmadi.` });
    }
    if (!shop.telegramChatId) {
      return res.status(400).json({ success: false, message: `"${order.ownerName}" hali Telegram botga ulanmagan.` });
    }
    const bot = getBotInstance();
    if (!bot) {
      return res.status(500).json({ success: false, message: "Telegram bot ishlamayapti." });
    }
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const unitPrice = order.product?.price || 0;
    const totalPrice = unitPrice * (order.quantity || 0);
    const receiptLabel = order.receiptNumber
      ? `\u2116${order.receiptNumber}/${order.receiptYear}`
      : `\u2116${order._id.toString().slice(-8).toUpperCase()}`;
    const caption =
      `\u2705 \u0427\u0435\u043a \u0437\u0430\u043a\u0430\u0437\u0430 ${receiptLabel}\n\n` +
      `\uD83C\uDFEA ${order.shopName}\n` +
      `\uD83D\uDC64 ${order.ownerName}\n` +
      `\uD83D\uDCE6 ${order.product?.name || "-"} (${order.quantity} \u0448\u0442)\n` +
      `\uD83D\uDCB0 \u0418\u0442\u043e\u0433\u043e: ${totalPrice.toLocaleString("ru-RU")} \u0441\u0443\u043c`;
    try {
      await bot.sendPhoto(shop.telegramChatId, buffer, { caption, protect_content: true });
    } catch (telegramErr) {
      console.error("Telegramga yuborishda xato:", telegramErr.message);
      const isBlocked =
        telegramErr.message?.includes("bot was blocked") ||
        telegramErr.message?.includes("chat not found") ||
        telegramErr.message?.includes("user is deactivated");
      if (isBlocked) {
        await Shop.findByIdAndUpdate(shop._id, { telegramChatId: null });
        return res.status(400).json({ success: false, message: `"${order.ownerName}" Telegram botni bloklagan.` });
      }
      return res.status(502).json({ success: false, message: `Telegramga yuborishda xato: ${telegramErr.message}` });
    }
    const updatedOrder = await Order.findByIdAndUpdate(orderId, { $inc: { receiptSentCount: 1 } }, { new: true });
    res.status(200).json({
      success: true,
      message: `Chek yuborildi (${order.ownerName})`,
      receiptSentCount: updatedOrder.receiptSentCount,
    });
  } catch (err) {
    console.error("Chekni yuborishda xato:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

export default route;