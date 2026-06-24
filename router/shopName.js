import express from "express";
import mongoose from "mongoose";
import Shop from "../models/shopNameSchema.js";
import auth from "../middleware/middleware.auth.js";

const route = express.Router();

// CREATE
route.post("/shops", auth, async (req, res) => {
  try {
    const { shopName, ownerName, phone, district, location } = req.body; // ✅ location qo'shildi

    if (!shopName || !ownerName || !phone || !district) {
      return res.status(400).json({
        success: false,
        message: "Do'kon nomi, egasi, telefon raqami va tumani kiritilishi shart!",
      });
    }

    const isExist = await Shop.findOne({ shopName: shopName?.trim() });
    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Bunday nomli do'kon allaqachon mavjud!",
      });
    }

    const newShop = await Shop.create({
      shopName: shopName?.trim(),
      ownerName: ownerName?.trim(),
      phone: phone,
      district: district?.trim() || null,
      // ✅ location: faqat lat/lng mavjud bo'lsa saqlaymiz, aks holda null
      location:
        location?.lat != null && location?.lng != null
          ? { lat: location.lat, lng: location.lng }
          : { lat: null, lng: null },
    });

    res.status(201).json({
      success: true,
      message: "Do'kon muvaffaqiyatli qo'shildi",
      data: newShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Do'kon qo'shishda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// READ ALL
route.get("/shops", auth, async (req, res) => {
  try {
    const shops = await Shop.find().sort({ shopName: 1 });

    res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Serverda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// READ ONE
route.get("/shops/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const shop = await Shop.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ success: false, message: "Do'kon topilmadi!" });
    }

    res.status(200).json({ success: true, data: shop });
  } catch (error) {
    res.status(500).json({ success: false, message: "Serverda xatolik", error: error.message });
  }
});

// UPDATE
route.put("/shops/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const { shopName, ownerName, phone, district, location } = req.body; // ✅ location qo'shildi

    if (shopName) {
      const isExist = await Shop.findOne({
        shopName: shopName.trim(),
        _id: { $ne: req.params.id },
      });
      if (isExist) {
        return res.status(400).json({
          success: false,
          message: "Bunday nomli boshqa do'kon mavjud!",
        });
      }
    }

    const updateData = {
      ...(shopName && { shopName: shopName.trim() }),
      ...(ownerName && { ownerName: ownerName.trim() }),
      ...(phone && { phone }),
      ...(district && { district: district.trim() }),
      // ✅ location berilgan bo'lsa yangilaymiz
      ...(location?.lat != null && location?.lng != null && {
        location: { lat: location.lat, lng: location.lng },
      }),
    };

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedShop) {
      return res.status(404).json({ success: false, message: "Do'kon topilmadi!" });
    }

    res.status(200).json({
      success: true,
      message: "Do'kon ma'lumotlari yangilandi",
      data: updatedShop,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Yangilashda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// DELETE
route.delete("/shops/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const deletedShop = await Shop.findByIdAndDelete(req.params.id);

    if (!deletedShop) {
      return res.status(404).json({ success: false, message: "Do'kon topilmadi!" });
    }

    res.status(200).json({
      success: true,
      message: "Do'kon bazadan butunlay o'chirildi",
      data: deletedShop,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "O'chirishda xatolik yuz berdi",
      error: error.message,
    });
  }
});

export default route;