import express from "express";
import mongoose from "mongoose";
import TradeAgent from "../models/tradeAgentSchema.js";
import auth from "../middleware/middleware.auth.js";

const route = express.Router();

// 1. AGENT QO'SHISH (POST) — admin faqat
route.post("/agents", auth, async (req, res) => {
  try {
    const { name, phone, district, password } = req.body;

    if (!name || !phone || !district || !password) {
      return res.status(400).json({
        success: false,
        message: "Ism, telefon, tuman va parol kiritilishi shart!",
      });
    }

    const isExist = await TradeAgent.findOne({ phone: phone.trim() });
    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Bu telefon raqamli agent allaqachon mavjud!",
      });
    }

    const newAgent = await TradeAgent.create({
      name: name.trim(),
      phone: phone.trim(),
      district: district.trim(),
      password,
    });

    res.status(201).json({
      success: true,
      message: "Agent muvaffaqiyatli qo'shildi",
      data: newAgent,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Agent qo'shishda xatolik",
      error: error.message,
    });
  }
});

// 2. BARCHA AGENTLARNI OLISH (GET)
route.get("/agents", auth, async (req, res) => {
  try {
    const agents = await TradeAgent.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Serverda xatolik",
      error: error.message,
    });
  }
});

// 3. BITTA AGENTNI OLISH (GET /:id)
route.get("/agents/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID!" });
    }

    const agent = await TradeAgent.findById(req.params.id);
    if (!agent) {
      return res.status(404).json({ success: false, message: "Agent topilmadi!" });
    }

    res.status(200).json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. AGENTNI YANGILASH (PUT /:id)
route.put("/agents/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID!" });
    }

    const { name, phone, district, password, isActive } = req.body;

    const updatedAgent = await TradeAgent.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name: name.trim() }),
        ...(phone && { phone: phone.trim() }),
        ...(district && { district: district.trim() }),
        ...(password && { password }),
        ...(isActive !== undefined && { isActive }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedAgent) {
      return res.status(404).json({ success: false, message: "Agent topilmadi!" });
    }

    // Agar district o'zgartirilsa — agent botdan chiqariladi (qayta login kerak)
    if (district) {
      await TradeAgent.findByIdAndUpdate(req.params.id, { telegramChatId: null });
      updatedAgent.telegramChatId = null;
    }

    res.status(200).json({
      success: true,
      message: "Agent yangilandi",
      data: updatedAgent,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// 5. AGENTNI O'CHIRISH (DELETE /:id)
route.delete("/agents/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Noto'g'ri ID!" });
    }

    const deletedAgent = await TradeAgent.findByIdAndDelete(req.params.id);
    if (!deletedAgent) {
      return res.status(404).json({ success: false, message: "Agent topilmadi!" });
    }

    res.status(200).json({
      success: true,
      message: "Agent o'chirildi",
      data: deletedAgent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default route;