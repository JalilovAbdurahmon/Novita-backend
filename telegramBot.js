import TelegramBot from "node-telegram-bot-api";
import Shop from "./models/shopNameSchema.js";
import Order from "./models/orderSchema.js";
import ProductToOrder from "./models/productsToOrderSchema.js";

let bot = null;

const pendingAuth = new Map();
const pendingOrder = new Map();
const userLangs = new Map();

// ─── Tarjimalar ───────────────────────────────────────────────────────────────
const T = {
  uz: {
    welcome:
      "Assalomu alaykum! 👋\n\nTizimga ulanish uchun telefon raqamingizni yuboring.",
    sharePhone: "📱 Raqamni ulashish",
    phoneNotFound:
      "❌ Bu raqam bo'yicha do'kon topilmadi. Administrator bilan bog'laning.",
    phoneConfirmed: "✅ Raqam tasdiqlandi.\n\n🔒 Endi parolni kiriting:",
    wrongPassword: "❌ Parol noto'g'ri. Qaytadan urinib ko'ring:",
    shopNotFound: "Do'kon topilmadi, qaytadan /start bosing.",
    authSuccess: (shopName) =>
      `✅ Tayyor! "${shopName}" bo'yicha cheklar shu yerga keladi.\n\n` +
      `Quyidagi menyudan foydalaning:`,
    welcomeBack: (shopName) =>
      `👋 Qaytib keldingiz! "${shopName}"\n\nQuyidagi menyudan foydalaning:`,
    notRegistered: "❌ Siz tizimga ulanmagansiz. /start bosing.",
    noProducts: "❌ Hozircha faol mahsulotlar mavjud emas.",
    selectProduct: "📦 Mahsulotni tanlang:",
    productNotFound: "Mahsulot topilmadi!",
    productSelected: (name) =>
      `✅ Tanlandi: *${name}*\n\nNechtadan kerak? (raqam kiriting):`,
    invalidQty: "⚠️ Iltimos, to'g'ri raqam kiriting (masalan: 5):",
    orderSuccess: (shop, productName, qty) =>
      `✅ Zakaz qabul qilindi!\n\n` +
      `🏪 ${shop.shopName}\n` +
      `👤 ${shop.ownerName}\n` +
      `📦 ${productName} — ${qty} ta\n` +
      `📍 ${shop.district}\n` +
      `🕐 ${new Date().toLocaleString("ru-RU")}`,
    orderError: (msg) =>
      `❌ Zakaz yaratishda xatolik: ${msg}\n\nQaytadan urinib ko'ring.`,
    orderBtn: "📦 Zakaz berish",
    changeLang: "🌐 Tilni o'zgartirish",
    selectLang: "🌐 Tilni tanlang / Выберите язык:",
    startOver: "/start bosing.",
    serverError: "Xatolik yuz berdi, qaytadan /start bosing.",
    serverError2: "Xatolik yuz berdi. Qaytadan urinib ko'ring.",
  },
  ru: {
    welcome:
      "Здравствуйте! 👋\n\nДля подключения к системе отправьте ваш номер телефона.",
    sharePhone: "📱 Поделиться номером",
    phoneNotFound:
      "❌ Магазин с этим номером не найден. Обратитесь к администратору.",
    phoneConfirmed: "✅ Номер подтверждён.\n\n🔒 Теперь введите пароль:",
    wrongPassword: "❌ Неверный пароль. Попробуйте снова:",
    shopNotFound: "Магазин не найден, нажмите /start снова.",
    authSuccess: (shopName) =>
      `✅ Готово! Чеки для "${shopName}" будут приходить сюда.\n\n` +
      `Используйте меню ниже:`,
    welcomeBack: (shopName) =>
      `👋 С возвращением! "${shopName}"\n\nИспользуйте меню ниже:`,
    notRegistered: "❌ Вы не подключены к системе. Нажмите /start.",
    noProducts: "❌ Активных товаров пока нет.",
    selectProduct: "📦 Выберите товар:",
    productNotFound: "Товар не найден!",
    productSelected: (name) =>
      `✅ Выбрано: *${name}*\n\nСколько нужно? (введите число):`,
    invalidQty: "⚠️ Пожалуйста, введите корректное число (например: 5):",
    orderSuccess: (shop, productName, qty) =>
      `✅ Заказ принят!\n\n` +
      `🏪 ${shop.shopName}\n` +
      `👤 ${shop.ownerName}\n` +
      `📦 ${productName} — ${qty} шт\n` +
      `📍 ${shop.district}\n` +
      `🕐 ${new Date().toLocaleString("ru-RU")}`,
    orderError: (msg) =>
      `❌ Ошибка при создании заказа: ${msg}\n\nПопробуйте снова.`,
    orderBtn: "📦 Оформить заказ",
    changeLang: "🌐 Сменить язык",
    selectLang: "🌐 Tilni tanlang / Выберите язык:",
    startOver: "Нажмите /start.",
    serverError: "Произошла ошибка, нажмите /start снова.",
    serverError2: "Произошла ошибка. Попробуйте снова.",
  },
};

// ─── Til: RAM + MongoDB sinxronlash ──────────────────────────────────────────
// RAM dan oladi (tez), yo'q bo'lsa MongoDB dan oladi, u ham yo'q bo'lsa "uz"
const getLang = (chatId) => userLangs.get(String(chatId)) || "uz";

const loadLangFromDb = async (chatId) => {
  if (userLangs.has(String(chatId))) return; // RAM da bor, yuklamaslik kerak
  try {
    const shop = await Shop.findOne({ telegramChatId: String(chatId) });
    if (shop?.preferredLang) {
      userLangs.set(String(chatId), shop.preferredLang);
    }
  } catch (_) {}
};

const saveLangToDb = async (chatId, lang) => {
  userLangs.set(String(chatId), lang); // RAM ga
  try {
    await Shop.findOneAndUpdate(
      { telegramChatId: String(chatId) },
      { preferredLang: lang }
    );
  } catch (_) {}
};

const t = (chatId, key, ...args) => {
  const lang = getLang(chatId);
  const val = T[lang][key];
  return typeof val === "function" ? val(...args) : val;
};

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
const safeDeleteMessage = async (chatId, messageId) => {
  try {
    await bot.deleteMessage(chatId, messageId);
  } catch (_) {}
};

const cleanupMessages = async (chatId, state) => {
  if (!state?.messageIdsToDelete?.length) return;
  for (const msgId of state.messageIdsToDelete) {
    await safeDeleteMessage(chatId, msgId);
  }
};

const findShopByChatId = async (chatId) =>
  await Shop.findOne({ telegramChatId: String(chatId) });

const mainMenuKeyboard = (chatId) => ({
  keyboard: [
    [{ text: t(chatId, "orderBtn") }],
    [{ text: t(chatId, "changeLang") }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
});

// ─── Bot ishga tushirish ──────────────────────────────────────────────────────
export const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const SHOP_PASSWORD = process.env.SHOP_TELEGRAM_PASSWORD;

  console.log(
    "DEBUG token:",
    token ? `TOPILDI (${token.slice(0, 10)}...)` : "TOPILMADI"
  );
  console.log(
    "DEBUG parol:",
    SHOP_PASSWORD ? "TOPILDI" : "TOPILMADI (SHOP_TELEGRAM_PASSWORD yo'q!)"
  );

  if (!token) {
    console.log("⚠️  TELEGRAM_BOT_TOKEN topilmadi, bot ishga tushmadi.");
    return null;
  }

  bot = new TelegramBot(token, { polling: true });
  console.log("🤖 Telegram bot ishga tushdi (polling)");

  // ─── /start ────────────────────────────────────────────────────────────────
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    const existingShop = await findShopByChatId(chatId);
    if (existingShop) {
      // ✅ Tilni MongoDB dan yuklash (server restart bo'lsa RAM bo'sh bo'ladi)
      await loadLangFromDb(chatId);
      pendingAuth.delete(chatId);
      pendingOrder.delete(chatId);
      return bot.sendMessage(
        chatId,
        t(chatId, "welcomeBack", existingShop.shopName),
        { reply_markup: mainMenuKeyboard(chatId) }
      );
    }

    pendingAuth.delete(chatId);
    pendingOrder.delete(chatId);

    const sentMsg = await bot.sendMessage(
      chatId,
      "🌐 Tilni tanlang / Выберите язык:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz_start" },
              { text: "🇷🇺 Русский", callback_data: "lang_ru_start" },
            ],
          ],
        },
      }
    );

    pendingAuth.set(chatId, {
      step: "awaiting_lang",
      messageIdsToDelete: [msg.message_id, sentMsg.message_id],
    });
  });

  // ─── Kontakt (telefon) ──────────────────────────────────────────────────────
  bot.on("contact", async (msg) => {
    const chatId = msg.chat.id;
    const state = pendingAuth.get(chatId);

    if (!state || state.step !== "awaiting_phone") {
      return bot.sendMessage(chatId, t(chatId, "startOver"));
    }

    const messageIdsToDelete = [...state.messageIdsToDelete, msg.message_id];
    const rawPhone = msg.contact.phone_number || "";
    const normalizedPhone = rawPhone.replace(/\D/g, "");

    try {
      const shops = await Shop.find();
      const matchedShop = shops.find((shop) => {
        const shopPhoneDigits = String(shop.phone).replace(/\D/g, "");
        return (
          shopPhoneDigits === normalizedPhone ||
          normalizedPhone.endsWith(shopPhoneDigits) ||
          shopPhoneDigits.endsWith(normalizedPhone)
        );
      });

      if (!matchedShop) {
        await cleanupMessages(chatId, { messageIdsToDelete });
        pendingAuth.delete(chatId);
        return bot.sendMessage(chatId, t(chatId, "phoneNotFound"), {
          reply_markup: { remove_keyboard: true },
        });
      }

      const sentMsg = await bot.sendMessage(
        chatId,
        t(chatId, "phoneConfirmed"),
        {
          reply_markup: { remove_keyboard: true },
        }
      );

      pendingAuth.set(chatId, {
        step: "awaiting_password",
        shopId: matchedShop._id.toString(),
        messageIdsToDelete: [...messageIdsToDelete, sentMsg.message_id],
      });
    } catch (err) {
      console.error("Contact tekshirishda xato:", err.message);
      bot.sendMessage(chatId, t(chatId, "serverError"));
    }
  });

  // ─── Inline keyboard callback ───────────────────────────────────────────────
  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await bot.answerCallbackQuery(query.id).catch(() => {});

    const removeInline = () =>
      bot
        .editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: query.message.message_id }
        )
        .catch(() => {});

    // ── Til tanlash — start oqimi ─────────────────────────────────────────
    if (data === "lang_uz_start" || data === "lang_ru_start") {
      const lang = data === "lang_uz_start" ? "uz" : "ru";
      userLangs.set(String(chatId), lang); // hozircha faqat RAM (login tugaguncha)
      await removeInline();

      const state = pendingAuth.get(chatId);
      await cleanupMessages(chatId, state);

      const sentMsg = await bot.sendMessage(chatId, t(chatId, "welcome"), {
        reply_markup: {
          keyboard: [
            [{ text: t(chatId, "sharePhone"), request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });

      pendingAuth.set(chatId, {
        step: "awaiting_phone",
        lang, // ✅ tilni auth state ga saqlaymiz, login tugaganda DB ga yoziladi
        messageIdsToDelete: [sentMsg.message_id],
      });
      return;
    }

    // ── Til o'zgartirish — menyudan ───────────────────────────────────────
    if (data === "lang_uz_change" || data === "lang_ru_change") {
      const lang = data === "lang_uz_change" ? "uz" : "ru";
      // ✅ RAM + MongoDB ga saqlaymiz
      await saveLangToDb(chatId, lang);
      await removeInline();

      const shop = await findShopByChatId(chatId);
      await bot.sendMessage(
        chatId,
        shop ? t(chatId, "welcomeBack", shop.shopName) : t(chatId, "startOver"),
        { reply_markup: mainMenuKeyboard(chatId) }
      );
      return;
    }

    // ── Mahsulot tanlash ──────────────────────────────────────────────────
    if (data.startsWith("product_")) {
      const productId = data.replace("product_", "");
      let product;
      try {
        product = await ProductToOrder.findById(productId);
      } catch (_) {}

      if (!product) {
        return bot.sendMessage(chatId, t(chatId, "productNotFound"));
      }

      await removeInline();

      pendingOrder.set(chatId, {
        step: "awaiting_quantity",
        productId: product._id.toString(),
        productName: product.name,
      });

      await bot.sendMessage(
        chatId,
        t(chatId, "productSelected", product.name),
        {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        }
      );
    }
  });

  // ─── Matnli xabarlar ───────────────────────────────────────────────────────
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (msg.contact || msg.location) return;

    const text = msg.text?.trim();
    if (!text) return;
    if (text.startsWith("/")) return;

    // ✅ Har bir xabarda tilni DB dan yuklaymiz (RAM bo'sh bo'lsa)
    await loadLangFromDb(chatId);

    // ── Zakaz berish ──────────────────────────────────────────────────────
    if (text === "📦 Zakaz berish" || text === "📦 Оформить заказ") {
      const shop = await findShopByChatId(chatId);
      if (!shop) {
        return bot.sendMessage(chatId, t(chatId, "notRegistered"), {
          reply_markup: { remove_keyboard: true },
        });
      }

      pendingOrder.delete(chatId);

      try {
        const products = await ProductToOrder.find({ isActive: true }).sort({
          name: 1,
        });

        if (!products.length) {
          return bot.sendMessage(chatId, t(chatId, "noProducts"), {
            reply_markup: mainMenuKeyboard(chatId),
          });
        }

        const inline_keyboard = products.map((p) => [
          {
            text: `${p.name}${
              p.price ? ` — ${p.price.toLocaleString("ru-RU")} so'm` : ""
            }`,
            callback_data: `product_${p._id}`,
          },
        ]);

        await bot.sendMessage(chatId, t(chatId, "selectProduct"), {
          reply_markup: { inline_keyboard },
        });
      } catch (err) {
        console.error("Mahsulotlarni olishda xato:", err.message);
        bot.sendMessage(chatId, t(chatId, "serverError2"));
      }
      return;
    }

    // ── Tilni o'zgartirish ────────────────────────────────────────────────
    if (text === "🌐 Tilni o'zgartirish" || text === "🌐 Сменить язык") {
      await bot.sendMessage(chatId, t(chatId, "selectLang"), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇿 O'zbekcha", callback_data: "lang_uz_change" },
              { text: "🇷🇺 Русский", callback_data: "lang_ru_change" },
            ],
          ],
        },
      });
      return;
    }

    // ── Parol tekshirish ──────────────────────────────────────────────────
    const authState = pendingAuth.get(chatId);
    if (authState?.step === "awaiting_password") {
      const messageIdsToDelete = [
        ...authState.messageIdsToDelete,
        msg.message_id,
      ];

      if (text !== SHOP_PASSWORD) {
        const sentMsg = await bot.sendMessage(
          chatId,
          t(chatId, "wrongPassword")
        );
        pendingAuth.set(chatId, {
          ...authState,
          messageIdsToDelete: [...messageIdsToDelete, sentMsg.message_id],
        });
        return;
      }

      try {
        const updatedShop = await Shop.findByIdAndUpdate(
          authState.shopId,
          {
            telegramChatId: String(chatId),
            // ✅ Login paytida tanlangan tilni DB ga saqlaymiz
            preferredLang: authState.lang || "uz",
          },
          { new: true }
        );

        if (!updatedShop) {
          await cleanupMessages(chatId, { messageIdsToDelete });
          pendingAuth.delete(chatId);
          return bot.sendMessage(chatId, t(chatId, "shopNotFound"));
        }

        await cleanupMessages(chatId, { messageIdsToDelete });
        pendingAuth.delete(chatId);

        await bot.sendMessage(
          chatId,
          t(chatId, "authSuccess", updatedShop.shopName),
          { reply_markup: mainMenuKeyboard(chatId) }
        );
      } catch (err) {
        console.error("Parolni tasdiqlashda xato:", err.message);
        bot.sendMessage(chatId, t(chatId, "serverError"));
      }
      return;
    }

    // ── Miqdor kiritish — do'kon locationidan avtomatik foydalanadi ───────
    const orderState = pendingOrder.get(chatId);
    if (orderState?.step === "awaiting_quantity") {
      const qty = parseInt(text);
      if (isNaN(qty) || qty <= 0) {
        return bot.sendMessage(chatId, t(chatId, "invalidQty"));
      }

      try {
        const shop = await findShopByChatId(chatId);
        if (!shop) {
          pendingOrder.delete(chatId);
          return bot.sendMessage(chatId, t(chatId, "startOver"), {
            reply_markup: mainMenuKeyboard(chatId),
          });
        }

        // ✅ Do'kon locationini ishlatamiz — qayta so'ramaymiz
        const newOrder = new Order({
          shopName: shop.shopName,
          ownerName: shop.ownerName,
          shopId: shop._id,
          phone: String(shop.phone),
          product: orderState.productId,
          quantity: qty,
          district: shop.district,
          location: {
            lat: shop.location?.lat,
            lng: shop.location?.lng,
          },
        });

        const savedOrder = await newOrder.save();
        const populated = await Order.findById(savedOrder._id).populate(
          "product"
        );
        pendingOrder.delete(chatId);

        await bot.sendMessage(
          chatId,
          t(chatId, "orderSuccess", shop, populated.product?.name || "-", qty),
          { parse_mode: "Markdown", reply_markup: mainMenuKeyboard(chatId) }
        );
      } catch (err) {
        console.error("❌ Zakaz yaratishda xato:", err);
        pendingOrder.delete(chatId);
        bot.sendMessage(chatId, t(chatId, "orderError", err.message), {
          reply_markup: mainMenuKeyboard(chatId),
        });
      }
      return;
    }
  });

  // ─── /myid ─────────────────────────────────────────────────────────────────
  bot.onText(/\/myid/, (msg) => {
    bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
  });

  bot.on("polling_error", (err) => {
    console.error("Telegram polling xatosi:", err.message);
  });

  return bot;
};

export const getBotInstance = () => bot;

export const sendReceiptToTelegram = async (chatId, imageBase64) => {
  if (!bot) throw new Error("Bot ishga tushmagan");
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");
  await bot.sendPhoto(chatId, imageBuffer, {
    caption: "🧾 Buyurtma cheki",
    protect_content: true,
  });
};
