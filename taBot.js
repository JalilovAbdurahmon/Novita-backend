import TelegramBot from "node-telegram-bot-api";
import TradeAgent from "./models/tradeAgentSchema.js";
import Shop from "./models/shopNameSchema.js";
import Order from "./models/orderSchema.js";
import ProductToOrder from "./models/productsToOrderSchema.js";

let taBot = null;

// ─── State xaritalari ────────────────────────────────────────────────────────
const pendingAuth = new Map(); // login jarayoni
const pendingShop = new Map(); // do'kon qo'shish jarayoni
const pendingOrder = new Map(); // zakaz berish jarayoni
const userLangs = new Map(); // til: chatId -> "uz" | "ru"

// ─── Tarjimalar ──────────────────────────────────────────────────────────────
const T = {
  uz: {
    // Auth
    welcome:
      "Assalomu alaykum! 👋\n\nTizimga kirish uchun parolingizni kiriting:",
    wrongPassword: "❌ Parol noto'g'ri. Qaytadan urinib ko'ring:",
    authSuccess: (name, district) =>
      `✅ Xush kelibsiz, *${name}*!\n📍 Tumaningiz: *${district}*\n\nQuyidagi menyudan foydalaning:`,
    welcomeBack: (name, district) =>
      `👋 Qaytib keldingiz, *${name}*!\n📍 Tuman: *${district}*\n\nQuyidagi menyudan foydalaning:`,
    notRegistered: "❌ Siz tizimga ulanmagansiz. /start bosing.",

    // Menyu
    addShopBtn: "🏪 Do'kon qo'shish",
    orderBtn: "📦 Zakaz berish",
    changeLangBtn: "🌐 Tilni o'zgartirish",

    // Do'kon qo'shish
    enterShopName: "🏪 Do'kon nomini kiriting:",
    enterOwnerName: "👤 Do'kon egasining ismini kiriting:",
    enterPhone: "📞 Telefon raqamini kiriting (masalan: 998901234567):",
    shareLocation: "📍 Do'kon manzilini (lokatsiya) yuboring:",
    shareLocationBtn: "📍 Lokatsiya yuborish",
    shopExist: (name) => `❌ "${name}" nomli do'kon allaqachon mavjud!`,
    shopSuccess: (name, district) =>
      `✅ Do'kon muvaffaqiyatli qo'shildi!\n\n🏪 ${name}\n📍 ${district}`,
    shopError: "❌ Do'kon qo'shishda xatolik. Qaytadan urinib ko'ring.",
    cancelBtn: "❌ Bekor qilish",
    cancelled: "❌ Bekor qilindi.",

    // Zakaz berish
    noShops: "❌ Sizning tumaningizda hali do'kon yo'q. Avval do'kon qo'shing.",
    selectShop: "🏪 Qaysi do'konga zakaz berasiz?",
    noProducts: "❌ Hozircha faol mahsulotlar mavjud emas.",
    selectProduct: "📦 Mahsulotni tanlang:",
    productNotFound: "❌ Mahsulot topilmadi!",
    productSelected: (name) =>
      `✅ Tanlandi: *${name}*\n\nNechtadan kerak? (raqam kiriting):`,
    invalidQty: "⚠️ Iltimos, to'g'ri raqam kiriting (masalan: 5):",
    orderSuccess: (shopName, productName, qty, district) =>
      `✅ Zakaz qabul qilindi!\n\n` +
      `🏪 ${shopName}\n` +
      `📦 ${productName} — ${qty} ta\n` +
      `📍 ${district}\n` +
      `🕐 ${new Date().toLocaleString("ru-RU")}`,
    orderError: (msg) => `❌ Zakaz yaratishda xatolik: ${msg}`,

    // Til
    selectLang: "🌐 Tilni tanlang / Выберите язык:",
    serverError: "❌ Xatolik yuz berdi. Qaytadan /start bosing.",
  },
  ru: {
    // Auth
    welcome: "Здравствуйте! 👋\n\nДля входа в систему введите ваш пароль:",
    wrongPassword: "❌ Неверный пароль. Попробуйте снова:",
    authSuccess: (name, district) =>
      `✅ Добро пожаловать, *${name}*!\n📍 Ваш район: *${district}*\n\nИспользуйте меню ниже:`,
    welcomeBack: (name, district) =>
      `👋 С возвращением, *${name}*!\n📍 Район: *${district}*\n\nИспользуйте меню ниже:`,
    notRegistered: "❌ Вы не подключены к системе. Нажмите /start.",

    // Menyu
    addShopBtn: "🏪 Добавить магазин",
    orderBtn: "📦 Оформить заказ",
    changeLangBtn: "🌐 Сменить язык",

    // Do'kon qo'shish
    enterShopName: "🏪 Введите название магазина:",
    enterOwnerName: "👤 Введите имя владельца магазина:",
    enterPhone: "📞 Введите номер телефона (например: 998901234567):",
    shareLocation: "📍 Отправьте геопозицию магазина:",
    shareLocationBtn: "📍 Отправить геопозицию",
    shopExist: (name) => `❌ Магазин "${name}" уже существует!`,
    shopSuccess: (name, district) =>
      `✅ Магазин успешно добавлен!\n\n🏪 ${name}\n📍 ${district}`,
    shopError: "❌ Ошибка при добавлении магазина. Попробуйте снова.",
    cancelBtn: "❌ Отмена",
    cancelled: "❌ Отменено.",

    // Zakaz berish
    noShops: "❌ В вашем районе магазинов пока нет. Сначала добавьте магазин.",
    selectShop: "🏪 В какой магазин оформляем заказ?",
    noProducts: "❌ Активных товаров пока нет.",
    selectProduct: "📦 Выберите товар:",
    productNotFound: "❌ Товар не найден!",
    productSelected: (name) =>
      `✅ Выбрано: *${name}*\n\nСколько нужно? (введите число):`,
    invalidQty: "⚠️ Пожалуйста, введите корректное число (например: 5):",
    orderSuccess: (shopName, productName, qty, district) =>
      `✅ Заказ принят!\n\n` +
      `🏪 ${shopName}\n` +
      `📦 ${productName} — ${qty} шт\n` +
      `📍 ${district}\n` +
      `🕐 ${new Date().toLocaleString("ru-RU")}`,
    orderError: (msg) => `❌ Ошибка при создании заказа: ${msg}`,

    // Til
    selectLang: "🌐 Tilni tanlang / Выберите язык:",
    serverError: "❌ Произошла ошибка. Нажмите /start снова.",
  },
};

const getLang = (chatId) => userLangs.get(String(chatId)) || "uz";
const t = (chatId, key, ...args) => {
  const lang = getLang(chatId);
  const val = T[lang][key];
  return typeof val === "function" ? val(...args) : val;
};

// ─── Yordamchi ───────────────────────────────────────────────────────────────
const safeDelete = async (chatId, msgId) => {
  try {
    await taBot.deleteMessage(chatId, msgId);
  } catch (_) {}
};

const findAgentByChatId = async (chatId) =>
  await TradeAgent.findOne({ telegramChatId: String(chatId), isActive: true });

const mainMenu = (chatId) => ({
  keyboard: [
    [{ text: t(chatId, "addShopBtn") }, { text: t(chatId, "orderBtn") }],
    [{ text: t(chatId, "changeLangBtn") }],
  ],
  resize_keyboard: true,
  one_time_keyboard: false,
});

// ─── Bot ishga tushirish ──────────────────────────────────────────────────────
export const initTaBot = () => {
  const token = process.env.TA_BOT_TOKEN;

  if (!token) {
    console.log("⚠️  TA_BOT_TOKEN topilmadi, TA bot ishga tushmadi.");
    return null;
  }

  taBot = new TelegramBot(token, { polling: true });
  console.log("🤖 TA Telegram bot ishga tushdi");

  // ─── /start ──────────────────────────────────────────────────────────────
  taBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    // Allaqachon login qilgan agent
    const existingAgent = await findAgentByChatId(chatId);
    if (existingAgent) {
      if (!userLangs.has(String(chatId))) userLangs.set(String(chatId), "uz");
      pendingAuth.delete(chatId);
      pendingShop.delete(chatId);
      pendingOrder.delete(chatId);
      return taBot.sendMessage(
        chatId,
        t(chatId, "welcomeBack", existingAgent.name, existingAgent.district),
        { parse_mode: "Markdown", reply_markup: mainMenu(chatId) }
      );
    }

    // Yangi foydalanuvchi — til tanlash
    pendingAuth.delete(chatId);
    pendingShop.delete(chatId);
    pendingOrder.delete(chatId);

    await taBot.sendMessage(chatId, "🌐 Tilni tanlang / Выберите язык:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🇺🇿 O'zbekcha", callback_data: "ta_lang_uz_start" },
            { text: "🇷🇺 Русский", callback_data: "ta_lang_ru_start" },
          ],
        ],
      },
    });

    pendingAuth.set(chatId, { step: "awaiting_lang" });
  });

  // ─── Geolokatsiya ────────────────────────────────────────────────────────
  taBot.on("location", async (msg) => {
    const chatId = msg.chat.id;
    const { latitude, longitude } = msg.location;

    // Do'kon qo'shish — lokatsiya
    const shopState = pendingShop.get(chatId);
    if (shopState?.step === "awaiting_location") {
      await safeDelete(chatId, msg.message_id);
      const agent = await findAgentByChatId(chatId);
      if (!agent) {
        pendingShop.delete(chatId);
        return taBot.sendMessage(chatId, t(chatId, "notRegistered"));
      }

      try {
        const isExist = await Shop.findOne({
          shopName: shopState.shopName.trim(),
        });
        if (isExist) {
          pendingShop.delete(chatId);
          return taBot.sendMessage(
            chatId,
            t(chatId, "shopExist", shopState.shopName),
            { reply_markup: mainMenu(chatId) }
          );
        }

        const newShop = await Shop.create({
          shopName: shopState.shopName.trim(),
          ownerName: shopState.ownerName.trim(),
          phone: shopState.phone.trim(),
          district: agent.district, // TA ning tumani avtomatik
          location: { lat: latitude, lng: longitude },
          addedByAgent: agent._id, // qaysi agent qo'shganini saqlaymiz
        });

        pendingShop.delete(chatId);
        await taBot.sendMessage(
          chatId,
          t(chatId, "shopSuccess", newShop.shopName, agent.district),
          { reply_markup: mainMenu(chatId) }
        );
      } catch (err) {
        console.error("Do'kon qo'shishda xato:", err.message);
        pendingShop.delete(chatId);
        taBot.sendMessage(chatId, t(chatId, "shopError"), {
          reply_markup: mainMenu(chatId),
        });
      }
      return;
    }
  });

  // ─── Callback query ──────────────────────────────────────────────────────
  taBot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    await taBot.answerCallbackQuery(query.id).catch(() => {});

    const removeInline = () =>
      taBot
        .editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: query.message.message_id }
        )
        .catch(() => {});

    // ── Til tanlash — start ──────────────────────────────────────────────
    if (data === "ta_lang_uz_start" || data === "ta_lang_ru_start") {
      const lang = data === "ta_lang_uz_start" ? "uz" : "ru";
      userLangs.set(String(chatId), lang);
      await removeInline();

      const sentMsg = await taBot.sendMessage(chatId, t(chatId, "welcome"), {
        reply_markup: { remove_keyboard: true },
      });

      pendingAuth.set(chatId, {
        step: "awaiting_password",
        msgIds: [sentMsg.message_id],
      });
      return;
    }

    // ── Til o'zgartirish — menyu ─────────────────────────────────────────
    if (data === "ta_lang_uz_change" || data === "ta_lang_ru_change") {
      const lang = data === "ta_lang_uz_change" ? "uz" : "ru";
      userLangs.set(String(chatId), lang);
      await removeInline();

      const agent = await findAgentByChatId(chatId);
      await taBot.sendMessage(
        chatId,
        agent
          ? t(chatId, "welcomeBack", agent.name, agent.district)
          : t(chatId, "notRegistered"),
        { parse_mode: "Markdown", reply_markup: mainMenu(chatId) }
      );
      return;
    }

    // ── Do'kon tanlash (zakaz uchun) ─────────────────────────────────────
    if (data.startsWith("ta_shop_")) {
      const shopId = data.replace("ta_shop_", "");
      await removeInline();

      try {
        const products = await ProductToOrder.find({ isActive: true }).sort({
          name: 1,
        });

        if (!products.length) {
          return taBot.sendMessage(chatId, t(chatId, "noProducts"), {
            reply_markup: mainMenu(chatId),
          });
        }

        const inline_keyboard = products.map((p) => [
          {
            text: `${p.name}${
              p.price ? ` — ${p.price.toLocaleString("ru-RU")} so'm` : ""
            }`,
            callback_data: `ta_product_${p._id}`,
          },
        ]);

        pendingOrder.set(chatId, {
          step: "awaiting_product",
          shopId,
        });

        await taBot.sendMessage(chatId, t(chatId, "selectProduct"), {
          reply_markup: { inline_keyboard },
        });
      } catch (err) {
        taBot.sendMessage(chatId, t(chatId, "serverError"));
      }
      return;
    }

    // ── Mahsulot tanlash ─────────────────────────────────────────────────
    if (data.startsWith("ta_product_")) {
      const productId = data.replace("ta_product_", "");
      await removeInline();

      const orderState = pendingOrder.get(chatId);
      if (!orderState) return;

      let product;
      try {
        product = await ProductToOrder.findById(productId);
      } catch (_) {}

      if (!product) {
        return taBot.sendMessage(chatId, t(chatId, "productNotFound"));
      }

      pendingOrder.set(chatId, {
        ...orderState,
        step: "awaiting_quantity",
        productId: product._id.toString(),
        productName: product.name,
      });

      await taBot.sendMessage(
        chatId,
        t(chatId, "productSelected", product.name),
        {
          parse_mode: "Markdown",
          reply_markup: { remove_keyboard: true },
        }
      );
      return;
    }
  });

  // ─── Matnli xabarlar ────────────────────────────────────────────────────
  taBot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    if (msg.location) return;

    const text = msg.text?.trim();
    if (!text) return;
    if (text.startsWith("/")) return;

    // ── "Do'kon qo'shish" tugmasi ────────────────────────────────────────
    const addShopTexts = ["🏪 Do'kon qo'shish", "🏪 Добавить магазин"];
    if (addShopTexts.includes(text)) {
      const agent = await findAgentByChatId(chatId);
      if (!agent) {
        return taBot.sendMessage(chatId, t(chatId, "notRegistered"), {
          reply_markup: { remove_keyboard: true },
        });
      }

      pendingShop.set(chatId, { step: "awaiting_shop_name" });
      pendingOrder.delete(chatId);

      await taBot.sendMessage(chatId, t(chatId, "enterShopName"), {
        reply_markup: {
          keyboard: [[{ text: t(chatId, "cancelBtn") }]],
          resize_keyboard: true,
        },
      });
      return;
    }

    // ── "Zakaz berish" tugmasi ───────────────────────────────────────────
    const orderTexts = ["📦 Zakaz berish", "📦 Оформить заказ"];
    if (orderTexts.includes(text)) {
      const agent = await findAgentByChatId(chatId);
      if (!agent) {
        return taBot.sendMessage(chatId, t(chatId, "notRegistered"), {
          reply_markup: { remove_keyboard: true },
        });
      }

      pendingShop.delete(chatId);
      pendingOrder.delete(chatId);

      try {
        // Faqat ushbu agentning tumanidagi do'konlar
        const shops = await Shop.find({ district: agent.district }).sort({
          shopName: 1,
        });

        if (!shops.length) {
          return taBot.sendMessage(chatId, t(chatId, "noShops"), {
            reply_markup: mainMenu(chatId),
          });
        }

        const inline_keyboard = shops.map((s) => [
          {
            text: `🏪 ${s.shopName} (${s.ownerName})`,
            callback_data: `ta_shop_${s._id}`,
          },
        ]);

        await taBot.sendMessage(chatId, t(chatId, "selectShop"), {
          reply_markup: { inline_keyboard },
        });
      } catch (err) {
        taBot.sendMessage(chatId, t(chatId, "serverError"));
      }
      return;
    }

    // ── "Til o'zgartirish" tugmasi ───────────────────────────────────────
    const langTexts = ["🌐 Tilni o'zgartirish", "🌐 Сменить язык"];
    if (langTexts.includes(text)) {
      await taBot.sendMessage(chatId, t(chatId, "selectLang"), {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇿 O'zbekcha", callback_data: "ta_lang_uz_change" },
              { text: "🇷🇺 Русский", callback_data: "ta_lang_ru_change" },
            ],
          ],
        },
      });
      return;
    }

    // ── "Bekor qilish" tugmasi ───────────────────────────────────────────
    const cancelTexts = ["❌ Bekor qilish", "❌ Отмена"];
    if (cancelTexts.includes(text)) {
      pendingShop.delete(chatId);
      pendingOrder.delete(chatId);
      await taBot.sendMessage(chatId, t(chatId, "cancelled"), {
        reply_markup: mainMenu(chatId),
      });
      return;
    }

    // ── Parol tekshirish ─────────────────────────────────────────────────
    const authState = pendingAuth.get(chatId);
    if (authState?.step === "awaiting_password") {
      // Barcha agentlar ichidan parol bo'yicha qidirish
      const agent = await TradeAgent.findOne({
        password: text,
        isActive: true,
      });

      if (!agent) {
        const sentMsg = await taBot.sendMessage(
          chatId,
          t(chatId, "wrongPassword")
        );
        pendingAuth.set(chatId, {
          ...authState,
          msgIds: [
            ...(authState.msgIds || []),
            msg.message_id,
            sentMsg.message_id,
          ],
        });
        return;
      }

      // Parol to'g'ri — chatId ni agentga biriktirish
      await TradeAgent.findByIdAndUpdate(agent._id, {
        telegramChatId: String(chatId),
      });

      // Xabarlarni tozalash
      for (const id of authState.msgIds || []) {
        await safeDelete(chatId, id);
      }
      await safeDelete(chatId, msg.message_id);

      pendingAuth.delete(chatId);

      await taBot.sendMessage(
        chatId,
        t(chatId, "authSuccess", agent.name, agent.district),
        { parse_mode: "Markdown", reply_markup: mainMenu(chatId) }
      );
      return;
    }

    // ── Do'kon qo'shish bosqichlari ──────────────────────────────────────
    const shopState = pendingShop.get(chatId);
    if (shopState) {
      if (shopState.step === "awaiting_shop_name") {
        pendingShop.set(chatId, {
          ...shopState,
          step: "awaiting_owner_name",
          shopName: text,
        });
        await taBot.sendMessage(chatId, t(chatId, "enterOwnerName"), {
          reply_markup: {
            keyboard: [[{ text: t(chatId, "cancelBtn") }]],
            resize_keyboard: true,
          },
        });
        return;
      }

      if (shopState.step === "awaiting_owner_name") {
        pendingShop.set(chatId, {
          ...shopState,
          step: "awaiting_phone",
          ownerName: text,
        });
        await taBot.sendMessage(chatId, t(chatId, "enterPhone"), {
          reply_markup: {
            keyboard: [[{ text: t(chatId, "cancelBtn") }]],
            resize_keyboard: true,
          },
        });
        return;
      }

      if (shopState.step === "awaiting_phone") {
        pendingShop.set(chatId, {
          ...shopState,
          step: "awaiting_location",
          phone: text,
        });
        await taBot.sendMessage(chatId, t(chatId, "shareLocation"), {
          reply_markup: {
            keyboard: [
              [{ text: t(chatId, "shareLocationBtn"), request_location: true }],
              [{ text: t(chatId, "cancelBtn") }],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        });
        return;
      }
    }

    // ── Miqdor kiritish (zakaz) — do'kon locationsidan avtomatik foydalanadi ──
    const orderState = pendingOrder.get(chatId);
    if (orderState?.step === "awaiting_quantity") {
      const qty = parseInt(text);
      if (isNaN(qty) || qty <= 0) {
        return taBot.sendMessage(chatId, t(chatId, "invalidQty"));
      }

      const agent = await findAgentByChatId(chatId);
      if (!agent) {
        pendingOrder.delete(chatId);
        return taBot.sendMessage(chatId, t(chatId, "notRegistered"));
      }

      try {
        const shop = await Shop.findById(orderState.shopId);
        if (!shop) {
          pendingOrder.delete(chatId);
          return taBot.sendMessage(chatId, t(chatId, "serverError"), {
            reply_markup: mainMenu(chatId),
          });
        }

        // Do'kon locationini ishlatamiz — qayta so'ramaymiz
        const newOrder = new Order({
          shopName: shop.shopName,
          ownerName: shop.ownerName,
          shopId: shop._id,
          phone: String(shop.phone),
          product: orderState.productId,
          quantity: qty,
          district: agent.district,
          location: {
            lat: shop.location?.lat,
            lng: shop.location?.lng,
          },
          agentId: agent._id,
        });

        const savedOrder = await newOrder.save();
        const populated = await Order.findById(savedOrder._id).populate(
          "product"
        );

        pendingOrder.delete(chatId);
        await taBot.sendMessage(
          chatId,
          t(
            chatId,
            "orderSuccess",
            shop.shopName,
            populated.product?.name || "-",
            qty,
            agent.district
          ),
          { parse_mode: "Markdown", reply_markup: mainMenu(chatId) }
        );
      } catch (err) {
        console.error("Zakaz yaratishda xato:", err.message);
        pendingOrder.delete(chatId);
        taBot.sendMessage(chatId, t(chatId, "orderError", err.message), {
          reply_markup: mainMenu(chatId),
        });
      }
      return;
    }
  });

  // ─── /myid ───────────────────────────────────────────────────────────────
  taBot.onText(/\/myid/, (msg) => {
    taBot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
  });

  taBot.on("polling_error", (err) => {
    console.error("TA bot polling xatosi:", err.message);
  });

  return taBot;
};

export const getTaBotInstance = () => taBot;
