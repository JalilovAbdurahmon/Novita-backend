import mongoose from "mongoose";

const TradeAgentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Agent ismi kiritilishi shart!"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Telefon raqami kiritilishi shart!"],
    },
    district: {
      type: String,
      required: [true, "Tuman kiritilishi shart!"],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Parol kiritilishi shart!"],
    },
    telegramChatId: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const TradeAgent = mongoose.model("tradeAgent", TradeAgentSchema);

export default TradeAgent;