import TelegramBot from "node-telegram-bot-api";
import BotUser from "./models/botUserSchema.js";
import BotOrder from "./models/botOrderSchema.js";
import Product from "./models/productsToOrderSchema.js";
import { HttpsProxyAgent } from "https-proxy-agent";

let clientBot = null;

const t = {
  uz: {
    chooseLang: "🌐 Tilni tanlang / Выберите язык:",
    enterName: "👤 Ismingizni kiriting:",
    sharePhone: "📱 Telefon raqamingizni yuboring:",
    sharePhoneBtn: "📱 Raqamni ulashish",
    welcome: (name) => `✅ Xush kelibsiz, ${name}!\n\nQuyidagi menyudan foydalaning:`,
    alreadyDone: "✅ Siz allaqachon ro'yxatdan o'tgansiz!",
    menu: "📋 Asosiy menyu:",
    changeLang: "🌐 Tilni o'zgartirish",
    orderBtn: "🛒 Menu",
    orderDone: (product, qty) => `✅ Zakaz qabul qilindi!\n📦 ${product} — ${qty} ta`,
    namePrompt: "Iltimos, faqat ism kiriting (harflar bilan):",
    phonePrompt: "Iltimos, tugmani bosib telefon raqamingizni yuboring:",
  },
  ru: {
    chooseLang: "🌐 Tilni tanlang / Выберите язык:",
    enterName: "👤 Введите ваше имя:",
    sharePhone: "📱 Отправьте ваш номер телефона:",
    sharePhoneBtn: "📱 Поделиться номером",
    welcome: (name) => `✅ Добро пожаловать, ${name}!\n\nИспользуйте меню ниже:`,
    alreadyDone: "✅ Вы уже зарегистрированы!",
    menu: "📋 Главное меню:",
    changeLang: "🌐 Сменить язык",
    orderBtn: "🛒 Меню",
    orderDone: (product, qty) => `✅ Заказ принят!\n📦 ${product} — ${qty} шт`,
    namePrompt: "Пожалуйста, введите только имя (буквами):",
    phonePrompt: "Пожалуйста, нажмите кнопку и отправьте номер телефона:",
  },
};

const langKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz" },
        { text: "🇷🇺 Русский", callback_data: "lang_ru" },
      ],
    ],
  },
};

const mainMenu = (lang) => {
  const MINI_APP_URL = process.env.MINI_APP_URL;
  const separator = MINI_APP_URL.includes("?") ? "&" : "?";
  const urlWithLang = `${MINI_APP_URL}${separator}lang=${lang}`;
  return {
    reply_markup: {
      keyboard: [
        [{ text: t[lang].orderBtn, web_app: { url: urlWithLang } }],
        [{ text: t[lang].changeLang }],
      ],
      resize_keyboard: true,
    },
  };
};

const phoneKeyboard = (lang) => ({
  reply_markup: {
    keyboard: [[{ text: t[lang].sharePhoneBtn, request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
});

export const initClientBot = () => {
  const BOT_TOKEN = process.env.CLIENT_BOT_TOKEN;
  const PROXY_URL = process.env.PROXY_URL;

  if (!BOT_TOKEN) {
    console.warn("CLIENT_BOT_TOKEN topilmadi, client bot ishlamaydi.");
    return;
  }

  const botOptions = PROXY_URL
    ? { polling: true, request: { agent: new HttpsProxyAgent(PROXY_URL) } }
    : { polling: true };

  clientBot = new TelegramBot(BOT_TOKEN, botOptions);
  console.log("✅ Client Telegram bot ishga tushdi");

  // ── /start ────────────────────────────────────────────────────────────────
  clientBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;
    let user = await BotUser.findOne({ telegramId });

    if (user?.isVerified) {
      const lang = user.lang || "uz";
      await clientBot.sendMessage(chatId, t[lang].alreadyDone);
      await clientBot.sendMessage(chatId, t[lang].menu, mainMenu(lang));
      return;
    }

    if (!user) {
      user = new BotUser({
        telegramId,
        firstName: msg.from.first_name,
        lastName: msg.from.last_name,
        username: msg.from.username,
        step: "lang",
      });
      await user.save();
    } else {
      user.step = "lang";
      await user.save();
    }

    await clientBot.sendMessage(chatId, t.uz.chooseLang, langKeyboard);
  });

  // ── Til tanlash ───────────────────────────────────────────────────────────
  clientBot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const telegramId = query.from.id;

    if (query.data === "lang_uz" || query.data === "lang_ru") {
      const lang = query.data === "lang_uz" ? "uz" : "ru";
      await clientBot.answerCallbackQuery(query.id);
      const user = await BotUser.findOne({ telegramId });

      if (user?.isVerified) {
        user.lang = lang;
        user.step = "done";
        await user.save();
        await clientBot.sendMessage(chatId, t[lang].welcome(user.fullName), mainMenu(lang));
      } else {
        await BotUser.findOneAndUpdate({ telegramId }, { lang, step: "name" });
        await clientBot.sendMessage(chatId, t[lang].enterName, {
          reply_markup: { remove_keyboard: true },
        });
      }
    }
  });

  // ── Barcha xabarlar ───────────────────────────────────────────────────────
  clientBot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    if (msg.text === "/start") return;
    if (msg.web_app_data) return;

    const user = await BotUser.findOne({ telegramId });
    if (!user) return;

    const lang = user.lang || "uz";

    if (user.step === "name" && msg.text) {
      const name = msg.text.trim();
      if (!name || name.length < 2) {
        await clientBot.sendMessage(chatId, t[lang].namePrompt);
        return;
      }
      user.fullName = name;
      user.step = "phone";
      await user.save();
      await clientBot.sendMessage(chatId, t[lang].sharePhone, phoneKeyboard(lang));
      return;
    }

    if (user.step === "phone" && msg.contact) {
      user.phone = msg.contact.phone_number;
      user.step = "done";
      user.isVerified = true;
      await user.save();
      await clientBot.sendMessage(chatId, t[lang].welcome(user.fullName), mainMenu(lang));
      return;
    }

    if (user.step === "phone" && msg.text) {
      await clientBot.sendMessage(chatId, t[lang].phonePrompt, phoneKeyboard(lang));
      return;
    }

    if (user.isVerified && (msg.text === t.uz.changeLang || msg.text === t.ru.changeLang)) {
      await clientBot.sendMessage(chatId, t.uz.chooseLang, langKeyboard);
      return;
    }
  });

  // ── Web App data ──────────────────────────────────────────────────────────
  // MiniApp dan { type:"order", productId, quantity, lat, lng } keladi
  // Hammasi bir xabarda — alohida location kutish kerak emas
  clientBot.on("message", async (msg) => {
    if (!msg.web_app_data) return;

    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    const user = await BotUser.findOne({ telegramId, isVerified: true });
    if (!user) return;

    const lang = user.lang || "uz";

    try {
      const data = JSON.parse(msg.web_app_data.data);
      const { productId, quantity, lat, lng } = data;

      if (!productId || !quantity || !lat || !lng) return;

      const product = await Product.findById(productId);
      if (!product) return;

      const newOrder = new BotOrder({
        botUser: user._id,
        telegramId,
        product: product._id,
        quantity,
        location: { lat, lng },
      });
      await newOrder.save();

      await clientBot.sendMessage(
        chatId,
        t[lang].orderDone(product.name, quantity),
        mainMenu(lang)
      );
    } catch (err) {
      console.error("WebApp data parse xatosi:", err.message);
    }
  });
};

export const getClientBotInstance = () => clientBot;