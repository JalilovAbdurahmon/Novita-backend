import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userSchema.js";

const route = express.Router();

route.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Username bazada bor-yo'qligini tekshiramiz
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "Bu username band!" });
    }

    // 2. Parolni shifrlaymiz (Hash)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Yangi foydalanuvchini bazaga saqlaymiz
    const newUser = new User({
      username,
      password: hashedPassword,
    });

    await newUser.save();
    res.status(201).json({
      success: true,
      message: "Foydalanuvchi muvaffaqiyatli yaratildi!",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// LOGIN (Tizimga kirish va Token olish)
// ==========================================
route.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Userni bazadan qidiramiz
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Username yoki parol xato!" });
    }

    // 2. Parolni solishtiramiz
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Username yoki parol xato!" });
    }

    // 3. JWT Token yaratamiz (Token 1 kun davomida amal qiladi)
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      success: true,
      message: "Tizimga muvaffaqiyatli kirdingiz!",
      token, // Frontend buni olib xotiraga (localStorage) saqlab qo'yadi
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default route;
