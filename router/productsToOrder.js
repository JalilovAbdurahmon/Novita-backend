import express from "express";
import mongoose from "mongoose";
import ProductsToOrder from "../models/productsToOrderSchema.js";
import auth from "../middleware/middleware.auth.js"

const route = express.Router(); 

route.post("/products", auth, async (req, res) => {
  try {
    const { name, price, isActive } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Mahsulot nomi kiritilishi shart!" });
    }

    const isExist = await ProductsToOrder.findOne({ name: name?.trim() });
    if (isExist) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Bunday nomli mahsulot allaqachon mavjud!",
        });
    }

    const newProduct = await ProductsToOrder.create({
      name: name?.trim(),
      price,
      isActive,
    });

    res.status(201).json({
      success: true,
      message: "Mahsulot muvaffaqiyatli qo'shildi",
      data: newProduct,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Mahsulot qo'shishda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// 2. READ ALL
route.get("/products", auth, async (req, res) => {
  try {
    const products = await ProductsToOrder.find().sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Serverda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// 3. READ ONE
route.get("/products/:id", auth, async (req, res) => {
  try {
    // ID formatini tekshirish
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const product = await ProductsToOrder.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Mahsulot topilmadi!" });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Serverda xatolik",
        error: error.message,
      });
  }
});

// 4. UPDATE
route.put("/products/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const { name, price, isActive } = req.body;

    if (name) {
      const isExist = await ProductsToOrder.findOne({
        name: name.trim(),
        _id: { $ne: req.params.id },
      });
      if (isExist) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Bunday nomli boshqa mahsulot mavjud!",
          });
      }
    }

    const updatedProduct = await ProductsToOrder.findByIdAndUpdate(
      req.params.id,
      {
        name: name?.trim(),
        price,
        isActive,
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Mahsulot topilmadi!" });
    }

    res.status(200).json({
      success: true,
      message: "Mahsulot ma'lumotlari yangilandi",
      data: updatedProduct,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Yangilashda xatolik yuz berdi",
      error: error.message,
    });
  }
});

// 5. DELETE
route.delete("/products/:id", auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Noto'g'ri ID formati!" });
    }

    const deletedProduct = await ProductsToOrder.findByIdAndDelete(
      req.params.id
    );

    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Mahsulot topilmadi!" });
    }

    res.status(200).json({
      success: true,
      message: "Mahsulot bazadan butunlay o'chirildi",
      data: deletedProduct,
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
