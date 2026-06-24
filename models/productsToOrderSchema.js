import mongoose from "mongoose";

let ProductToOrderSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Mahsulot nomi kiritilishi shart!"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      default: 0,
      min: [0, "Mahsulot narxi noldan kam bo'lishi mumkin emas!"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    }, // ixtiyoriy, lekin dizaynda ishlatiladi
    category: {
      type: String,
      default: "Barchasi",
    }, // kategoriya uchun
  },
  {
    timestamps: true,
  }
);

let ProductToOrder = mongoose.model("productToOrder", ProductToOrderSchema);

export default ProductToOrder;
