import mongoose from "mongoose";

// ✅ Har bir yil uchun alohida hisoblagich saqlaymiz.
// _id sifatida yilni o'zini ishlatamiz (masalan: 2026), shunda
// har yangi yil avtomatik 0'dan boshlanadi (document yo'q bo'lsa upsert bilan yaratiladi).
const ReceiptCounterSchema = new mongoose.Schema({
  _id: {
    type: Number, // yil, masalan 2026
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

const ReceiptCounter = mongoose.model("receiptCounter", ReceiptCounterSchema);

export default ReceiptCounter;
