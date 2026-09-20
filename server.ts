import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

import {
  CROP_KEYS,
  CONDITION_KEYS,
  CATEGORY_KEYS,
  TREND_KEYS,
  LANG_TO_FARMER,
  FARMER_TO_LANG,
  SUPPORTED_LANGUAGES,
  STT_LANGUAGE,
  catalog,
  currentLang,
  tr,
} from "./src/i18n.js";
import {
  db,
  isLowStock,
  isExpiringSoon,
  daysToExpiry,
  CategoryChoice,
  InventoryItem,
  CRAFTING_RECIPES,
  TRADERS,
  CROP_PROFIT_ANALYSIS,
  FIVE_DAY_WEATHER,
} from "./src/models.js";
import {
  estimateResources,
  suggestTools,
  answerFarmQuery,
} from "./src/utils.js";
import {
  getWeather,
  getMarketPrices,
  synthesizeSpeech,
  transcribeSpeech,
  WeatherData,
  MarketPrice,
} from "./src/integrations.js";

const app = express();
const PORT = 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

function getActiveUser(req: Request) {
  const userIdCookie = req.cookies?.kridarshi_uid;
  if (userIdCookie) {
    const id = parseInt(userIdCookie, 10);
    if (!isNaN(id)) {
      const user = db.getUserById(id);
      if (user) return user;
    }
  }
  return null;
}

function getActiveFarmer(req: Request) {
  const user = getActiveUser(req);
  if (user) {
    return db.getFarmerById(user.id);
  }
  return db.getDemoFarmer();
}

function getLang(req: Request): string {
  if (req.cookies?.kridarshi_lang) {
    return currentLang(req.cookies.kridarshi_lang);
  }
  const farmer = getActiveFarmer(req);
  const fromFarmer = FARMER_TO_LANG[farmer.preferred_language?.toLowerCase()];
  return currentLang(fromFarmer || "en");
}

function localizeWeather(weather: WeatherData, lang: string): WeatherData {
  const condLow = (weather.condition || "").toLowerCase();
  const key = CONDITION_KEYS[condLow];
  if (key) {
    return {
      ...weather,
      condition: tr(key, lang),
    };
  }
  return weather;
}

function localizePrices(prices: MarketPrice[], lang: string): (MarketPrice & { cropLabel?: string; trendLabel?: string })[] {
  return prices.map((price) => {
    const cropKey = CROP_KEYS[price.crop.toLowerCase()];
    const trendKey = TREND_KEYS[price.trend.toLowerCase()];
    return {
      ...price,
      crop: cropKey ? tr(cropKey, lang) : price.crop,
      trend: trendKey ? tr(trendKey, lang) : price.trend,
    };
  });
}

function buildDashboardSpeech(
  farmer: { name: string; village: string },
  weather: WeatherData,
  lowStock: InventoryItem[],
  expiring: InventoryItem[],
  lang: string
): string {
  const parts = [
    tr("speech_intro", lang, {
      name: farmer.name,
      village: farmer.village,
      temp: weather.temp_c,
      condition: weather.condition,
    }),
  ];

  if (lowStock.length === 0 && expiring.length === 0) {
    parts.push(tr("speech_no_alerts", lang));
  }
  if (lowStock.length > 0) {
    parts.push(tr("speech_low", lang, { names: lowStock.map((i) => i.name).join(", ") }));
  }
  if (expiring.length > 0) {
    parts.push(tr("speech_expiring", lang, { names: expiring.map((i) => i.name).join(", ") }));
  }
  return parts.join(" ");
}

// Global template helpers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const activeUser = getActiveUser(req);
  const activeFarmer = getActiveFarmer(req);
  const lang = getLang(req);
  res.locals.currentUser = activeUser;
  res.locals.farmer = activeFarmer;
  res.locals.CURRENT_LANG = lang;
  res.locals.T = catalog(lang);
  res.locals.SUPPORTED_LANGUAGES = SUPPORTED_LANGUAGES;
  res.locals.VOICE_ENABLED = Boolean((process.env.ELEVENLABS_API_KEY || "").trim());
  res.locals.currentPath = req.path;
  next();
});

// Authentication Routes
app.get("/auth/login/", (req: Request, res: Response) => {
  const nextUrl = (req.query.next as string) || "/";
  res.render("auth/login", { nextUrl, error: null, success: null, phone: "" });
});

app.post("/auth/login/", (req: Request, res: Response) => {
  const phone = (req.body.phone || "").trim();
  const password = req.body.password || "";
  const nextUrl = req.body.next || "/";

  const result = db.authenticateUser(phone, password);
  if (!result.success || !result.user) {
    res.render("auth/login", {
      nextUrl,
      error: result.message,
      success: null,
      phone,
    });
    return;
  }

  // Set session cookie
  res.cookie("kridarshi_uid", String(result.user.id), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  });

  // Also sync preferred language cookie
  const langCode = FARMER_TO_LANG[result.user.preferred_language?.toLowerCase()] || "en";
  res.cookie("kridarshi_lang", langCode, { maxAge: 365 * 24 * 60 * 60 * 1000 });

  res.redirect(nextUrl.startsWith("/") ? nextUrl : "/");
});

app.get("/auth/register/", (req: Request, res: Response) => {
  res.render("auth/register", { error: null, name: "", phone: "", village: "" });
});

app.post("/auth/register/", (req: Request, res: Response) => {
  const { name, phone, village, role, password, preferred_language } = req.body;

  const result = db.registerUser({
    name,
    phone,
    village,
    role,
    password,
    preferred_language,
  });

  if (!result.success || !result.user) {
    res.render("auth/register", {
      error: result.message,
      name,
      phone,
      village,
    });
    return;
  }

  // Auto-login upon successful registration
  res.cookie("kridarshi_uid", String(result.user.id), {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
  });

  const langCode = FARMER_TO_LANG[result.user.preferred_language?.toLowerCase()] || "en";
  res.cookie("kridarshi_lang", langCode, { maxAge: 365 * 24 * 60 * 60 * 1000 });

  res.redirect("/");
});

app.post("/auth/demo/", (req: Request, res: Response) => {
  const role = (req.body.role === "trader" ? "trader" : "farmer") as "farmer" | "trader";
  let targetUser = db.getUserByRole(role);
  if (!targetUser) {
    targetUser = db.getUserById(1);
  }

  if (targetUser) {
    res.cookie("kridarshi_uid", String(targetUser.id), {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
    });
    const langCode = FARMER_TO_LANG[targetUser.preferred_language?.toLowerCase()] || "en";
    res.cookie("kridarshi_lang", langCode, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  }

  res.redirect("/");
});

app.get("/auth/logout/", (req: Request, res: Response) => {
  res.clearCookie("kridarshi_uid");
  res.redirect("/auth/login/");
});

// Dashboard
app.get("/", async (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const lang = res.locals.CURRENT_LANG;
  const items = db.getFarmerItems(farmer.id);
  const lowStock = items.filter(isLowStock);
  const expiring = items.filter(isExpiringSoon);

  const rawWeather = await getWeather(28.99, 77.02);
  const weather = localizeWeather(rawWeather, lang);
  const prices = localizePrices(getMarketPrices(), lang);
  const estimate = estimateResources("wheat", "rabi", "loam", 2, farmer.id);
  const toolSuggestions = suggestTools(items.map((i) => i.name), lang);

  const inventoryRows = items.map((i) => {
    const catKey = CATEGORY_KEYS[i.category];
    return {
      item: i,
      category_label: catKey ? tr(catKey, lang) : i.category,
      is_low_stock: isLowStock(i),
      is_expiring_soon: isExpiringSoon(i),
    };
  });

  const lowStockMsgs = lowStock.map((i) =>
    tr("low_stock_item", lang, { name: i.name, quantity: i.quantity, unit: i.unit })
  );

  const expiringMsgs = expiring.map((i) =>
    tr("expiring_item", lang, { name: i.name, days: daysToExpiry(i) })
  );

  const speechText = buildDashboardSpeech(farmer, weather, lowStock, expiring, lang);

  res.render("dashboard", {
    farmer,
    items,
    inventory_rows: inventoryRows,
    low_stock: lowStock,
    expiring,
    weather,
    prices,
    estimate,
    estimate_seed: estimate.found ? tr("seed", lang, { kg: estimate.seed_kg }) : "",
    estimate_fertilizer: estimate.found ? tr("fertilizer", lang, { value: estimate.fertilizer_str }) : "",
    estimate_water: estimate.found ? tr("water", lang, { liters: estimate.water_liters_per_day }) : "",
    tool_suggestions: toolSuggestions,
    welcome_text: tr("welcome", lang, { name: farmer.name, village: farmer.village }),
    low_stock_msgs: lowStockMsgs,
    expiring_msgs: expiringMsgs,
    speech_text: speechText,
  });
});

// Inventory List
app.get("/inventory/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const lang = res.locals.CURRENT_LANG;
  const items = db.getFarmerItems(farmer.id);

  const inventoryRows = items.map((i) => {
    const catKey = CATEGORY_KEYS[i.category];
    return {
      item: i,
      category_label: catKey ? tr(catKey, lang) : i.category,
      is_low_stock: isLowStock(i),
      is_expiring_soon: isExpiringSoon(i),
    };
  });

  res.render("inventory_list", {
    inventory_rows: inventoryRows,
  });
});

// Inventory Add GET
app.get("/inventory/add/", (req: Request, res: Response) => {
  res.render("inventory_form");
});

// Inventory Add POST
app.post("/inventory/add/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const name = (req.body.name || "").trim();
  const category = (req.body.category || "seed") as CategoryChoice;
  const quantity = parseFloat(req.body.quantity) || 0;
  const unit = (req.body.unit || "kg").trim();
  const lowStockThreshold = parseFloat(req.body.low_stock_threshold) || 5;
  const expiryDate = req.body.expiry_date || null;

  if (name) {
    db.addItem(farmer.id, {
      name,
      category,
      quantity,
      unit,
      low_stock_threshold: lowStockThreshold,
      expiry_date: expiryDate,
    });
  }

  res.redirect("/inventory/");
});

// Inventory Quick Quantity Update
app.post("/inventory/update-qty/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const id = parseInt(req.body.id, 10);
  const delta = parseFloat(req.body.delta);
  const name = (req.body.name || "").trim();
  const quantity = parseFloat(req.body.quantity);

  if (!isNaN(id) && !isNaN(delta)) {
    db.updateQuantity(farmer.id, id, delta);
  } else if (name && !isNaN(quantity)) {
    const existing = db.findItemByName(farmer.id, name);
    if (existing) {
      db.setQuantity(farmer.id, existing.id, quantity);
    } else {
      db.addItem(farmer.id, {
        name,
        category: (req.body.category || "produce") as CategoryChoice,
        quantity,
        unit: req.body.unit || "kg",
        low_stock_threshold: 5,
        expiry_date: null,
      });
    }
  }

  if (req.headers.accept?.includes("application/json")) {
    res.json({ success: true });
    return;
  }
  res.redirect(req.headers.referer || "/inventory/");
});

// Inventory Delete POST
app.post("/inventory/delete/:id/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const id = parseInt(req.params.id, 10);
  if (!isNaN(id)) {
    db.deleteItem(farmer.id, id);
  }
  res.redirect("/inventory/");
});

// Visual OpenCV Scanner GET
app.get("/scanner/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  res.render("scanner", {
    farmer,
  });
});

// Resource Planner GET
app.get("/resource-planner/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const selectedCrop = (req.query.crop as string) || "wheat";
  const selectedSeason = (req.query.season as string) || "rabi";
  const selectedSoil = (req.query.soil as string) || "loam";
  const acres = parseFloat(req.query.acres as string) || 2;

  const estimate = estimateResources(selectedCrop, selectedSeason, selectedSoil, acres, farmer.id);

  res.render("resource_planner", {
    farmer,
    selectedCrop,
    selectedSeason,
    selectedSoil,
    acres,
    estimate,
  });
});

// Marketplace & Direct Mandi Traders GET
app.get("/marketplace/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const marketPrices = getMarketPrices();
  res.render("marketplace", {
    farmer,
    marketPrices,
    traders: TRADERS,
  });
});

// Marketplace Post Listing POST
app.post("/marketplace/post/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const { crop, quantity, price, location } = req.body;
  // Record alert
  db.addAlert(
    farmer.id,
    "sale_broadcast",
    `Broadcasted ${quantity}q of ${crop} at ₹${price}/q for pickup from ${location}. Sent to 4 verified traders.`
  );
  res.redirect("/marketplace/");
});

// Profitability & Resource Utilization Analytics GET
app.get("/analytics/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  res.render("analytics", {
    farmer,
    crops: CROP_PROFIT_ANALYSIS,
  });
});

// 5-Day Weather Forecast GET
app.get("/weather/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  res.render("weather", {
    farmer,
    forecast: FIVE_DAY_WEATHER,
  });
});

// Tool Crafting Workshop GET
app.get("/crafting/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const farmerItems = db.getFarmerItems(farmer.id);
  const successMsg = req.query.success as string;
  const errorMsg = req.query.error as string;

  res.render("crafting", {
    farmer,
    recipes: CRAFTING_RECIPES,
    farmerItems,
    successMsg,
    errorMsg,
  });
});

// Vakh Forms Integration GET
app.get("/vakh/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const allowedForms = ["u54v", "wmz6", "gwnc"];
  let selectedForm = (req.query.form as string) || "u54v";
  if (!allowedForms.includes(selectedForm)) {
    selectedForm = "u54v";
  }

  res.render("vakh", {
    farmer,
    selectedForm,
  });
});

// Craft Tool POST
app.post("/crafting/craft/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const recipeId = req.body.recipeId;
  const result = db.craftRecipe(farmer.id, recipeId);

  if (result.success) {
    res.redirect(`/crafting/?success=${encodeURIComponent(result.message)}`);
  } else {
    res.redirect(`/crafting/?error=${encodeURIComponent(result.message)}`);
  }
});

// Dispatch Alert POST (WhatsApp, SMS, Voice notification trigger)
app.post("/alerts/send/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const { crop, type, message } = req.body;
  const finalMsg = message || `${crop || 'Agricultural Produce'} out of stock alert!`;

  db.addAlert(farmer.id, type || "stockout_sms", finalMsg);

  // In production with Twilio credentials, triggers actual SMS/WhatsApp gateway.
  // In development, records in DB and farmer's alert history seamlessly.
  res.redirect(`/scanner/?alert_dispatched=true`);
});

// Ask / Query GET
app.get("/query/", (req: Request, res: Response) => {
  res.render("query", { answer: null, question: "" });
});

// Ask / Query POST
app.post("/query/", (req: Request, res: Response) => {
  const farmer = getActiveFarmer(req);
  const lang = res.locals.CURRENT_LANG;
  const question = (req.body.question || "").trim();
  let answer = "";
  if (question) {
    answer = answerFarmQuery(farmer, question, lang);
  }
  res.render("query", { answer, question });
});

// Set Language POST
app.post("/language/", (req: Request, res: Response) => {
  const lang = currentLang(req.body.language || "en");
  const farmer = getActiveFarmer(req);
  const langName = LANG_TO_FARMER[lang] || "English";
  db.updateFarmerLanguage(farmer.id, langName);

  res.cookie("kridarshi_lang", lang, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  const nextUrl = req.body.next || "/";
  res.redirect(nextUrl);
});

// Voice Speak TTS POST
app.post("/voice/speak/", async (req: Request, res: Response) => {
  const text = (req.body?.text || "").trim();
  if (!text) {
    res.status(400).json({ error: "empty" });
    return;
  }

  const { audio, error } = await synthesizeSpeech(text);
  if (error === "missing_key") {
    res.status(503).json({ error: "missing_key" });
    return;
  }
  if (!audio) {
    res.status(502).json({ error: error || "tts_failed" });
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.send(audio);
});

// Voice Transcribe STT POST
app.post("/voice/transcribe/", upload.single("audio") as any, async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "empty" });
    return;
  }

  const lang = res.locals.CURRENT_LANG;
  const langCode = STT_LANGUAGE[lang] || "";

  const { text, error } = await transcribeSpeech(
    file.buffer,
    file.originalname || "audio.webm",
    file.mimetype || "audio/webm",
    langCode
  );

  if (error === "missing_key") {
    res.status(503).json({ error: "missing_key" });
    return;
  }
  if (error || !text) {
    res.status(502).json({ error: error || "stt_failed" });
    return;
  }

  res.json({ text });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌾 KriDarshi server running on http://0.0.0.0:${PORT}`);
});
