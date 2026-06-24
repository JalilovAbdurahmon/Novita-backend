import mongoose from "mongoose";

let OrderSchema = mongoose.Schema({
  shopName: {
    type: String,
    required: true,
  },
  ownerName: {
    type: String,
    required: true,
    trim: true, // ✅ Shop.ownerName bilan bir xil qoidaga keltirildi
  },
  // ✅ YANGI: Shop hujjatiga to'g'ridan-to'g'ri bog'lanish.
  // ownerName matn solishtirishiga bog'liq bo'lmaslik uchun.
  // required: false — eski (oldin yaratilgan) orderlar buzilmasligi uchun.
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "shop",
    required: false,
    default: null,
  },
  phone: {
    type: String,
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "productToOrder",
    required: [true, "Mahsulot tanlanishi shart!"],
  },
  quantity: {
    type: Number,
    required: true,
  },
  district: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    lat: { type: Number, required: true }, // Kenglik (Latitude) - masalan: 41.31108
    lng: { type: Number, required: true }, // Uzunlik (Longitude) - masalan: 69.24056
    address: { type: String }, // Ixtiyoriy: matnli manzil (agar kerak bo'lsa)
  },
  status: {
    type: String,
    enum: ["berilmoqda", "berildi"],
    default: "berilmoqda",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // ✅ Zakaz "Выполнено" bosilgan vaqti
  completedAt: {
    type: Date,
    default: null,
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "tradeAgent",
    default: null,
  },
  receiptNumber: {
    type: Number,
    default: null,
  }, // chek raqami
  receiptYear: {
    type: Number,
    default: null,
  }, // qaysi yil uchun
  receiptSentCount: {
    type: Number,
    default: 0,
  }, // necha marta yuborilgan
});

let Order = mongoose.model("order", OrderSchema);

export default Order;
