import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface WeatherData {
  mock: boolean;
  temp_c: number;
  condition: string;
  rain_chance_pct: number | null;
}

export async function getWeather(lat = 28.99, lon = 77.02): Promise<WeatherData> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return {
      mock: true,
      temp_c: 29,
      condition: "Partly cloudy",
      rain_chance_pct: 20,
    };
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API returned ${res.status}`);
    const data = (await res.json()) as any;
    return {
      mock: false,
      temp_c: Math.round(data.main?.temp ?? 29),
      condition: data.weather?.[0]?.description ?? "Clear",
      rain_chance_pct: null,
    };
  } catch (err) {
    console.warn("Weather fetch error, falling back to mock:", err);
    return {
      mock: true,
      temp_c: 29,
      condition: "Partly cloudy (fallback)",
      rain_chance_pct: 20,
    };
  }
}

export interface MarketPrice {
  crop: string;
  market: string;
  price_per_quintal: number;
  trend: string;
  trader_contact: string;
}

let cachedPrices: MarketPrice[] | null = null;

export function getMarketPrices(crop?: string): MarketPrice[] {
  if (!cachedPrices) {
    const csvPath = path.join(process.cwd(), "data", "market_prices.csv");
    if (!fs.existsSync(csvPath)) {
      // Fallback sample market prices if CSV not present
      cachedPrices = [
        { crop: "Wheat", market: "Sonipat Mandi", price_per_quintal: 2275, trend: "up", trader_contact: "+919811122233" },
        { crop: "Onion", market: "Nashik Mandi", price_per_quintal: 3100, trend: "down", trader_contact: "+919822233344" },
        { crop: "Rice", market: "Karnal Mandi", price_per_quintal: 3850, trend: "steady", trader_contact: "+919833344455" },
        { crop: "Cotton", market: "Rajkot Mandi", price_per_quintal: 7100, trend: "up", trader_contact: "+919844455566" },
      ];
    } else {
      try {
        const fileContent = fs.readFileSync(csvPath, "utf-8");
        const records = parse(fileContent, {
          columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
          skip_empty_lines: true,
          bom: true,
        }) as Record<string, string>[];

        const list: MarketPrice[] = [];
        const trends = ["up", "down", "steady"];

        for (let i = 0; i < records.length; i++) {
          const row = records[i];
          const cropName = row.commodity || row.crop || "Unknown";
          const marketName = row.market || row.mandi || "Unknown";
          const priceRaw = row.modal_x0020_price || row.modal_price || row.price_per_quintal || row.price || "0";
          const price = parseFloat(priceRaw) || 0;
          const trend = row.trend || trends[i % trends.length];

          list.push({
            crop: cropName,
            market: marketName,
            price_per_quintal: price,
            trend: trend,
            trader_contact: row.trader_contact || "N/A",
          });
        }
        cachedPrices = list;
      } catch (e) {
        console.error("Error reading market_prices.csv:", e);
        cachedPrices = [];
      }
    }
  }

  if (crop) {
    const c = crop.toLowerCase();
    return cachedPrices.filter((p) => p.crop.toLowerCase() === c);
  }

  // When returning all prices for dashboard display:
  // Select key representative crops (Wheat, Onion, Rice, Cotton, Potato, Tomato)
  // or first 5 if none matched
  const keyCrops = ["wheat", "onion", "rice", "cotton", "potato", "tomato"];
  const selected: MarketPrice[] = [];
  const seenCrops = new Set<string>();

  for (const p of cachedPrices) {
    const cLow = p.crop.toLowerCase();
    if (keyCrops.includes(cLow) && !seenCrops.has(cLow)) {
      selected.push(p);
      seenCrops.add(cLow);
    }
  }

  if (selected.length > 0) {
    return selected;
  }
  return cachedPrices.slice(0, 5);
}

export async function sendAlert(phone: string, message: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!sid || !token) {
    console.log(`[MOCK ALERT] to ${phone}: ${message}`);
    return false;
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams();
    params.append("To", `whatsapp:${phone}`);
    params.append("From", from || "");
    params.append("Body", message);

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    return res.ok;
  } catch (err) {
    console.error("[ALERT SEND FAILED]", err);
    return false;
  }
}

const TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const FREE_PLAN_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

export async function synthesizeSpeech(text: string): Promise<{ audio: Buffer | null; error: string }> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim().replace(/['"]/g, "");
  if (!apiKey) {
    return { audio: null, error: "missing_key" };
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || FREE_PLAN_VOICE_ID;
  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

  try {
    const res = await fetch(`${TTS_URL}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: modelId,
      }),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return { audio: Buffer.from(arrayBuf), error: "" };
    }

    const errText = await res.text();
    console.error("[ELEVENLABS TTS FAILED]", res.status, errText);
    return { audio: null, error: "tts_failed" };
  } catch (err: any) {
    console.error("[ELEVENLABS TTS FAILED]", err);
    return { audio: null, error: "tts_failed" };
  }
}

export async function transcribeSpeech(
  audioBuffer: Buffer,
  filename: string,
  contentType: string,
  languageCode = ""
): Promise<{ text: string; error: string }> {
  const apiKey = (process.env.ELEVENLABS_API_KEY || "").trim().replace(/['"]/g, "");
  if (!apiKey) {
    return { text: "", error: "missing_key" };
  }

  try {
    const formData = new FormData();
    const uint8 = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8], { type: contentType || "audio/webm" });
    formData.append("file", blob, filename || "speech.webm");
    formData.append("model_id", "scribe_v2");
    if (languageCode) {
      formData.append("language_code", languageCode);
    }

    const res = await fetch(STT_URL, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      return { text: (data.text || "").trim(), error: "" };
    }

    const errBody = await res.text();
    console.error("[ELEVENLABS STT FAILED]", res.status, errBody);
    return { text: "", error: "stt_failed" };
  } catch (err: any) {
    console.error("[ELEVENLABS STT FAILED]", err);
    return { text: "", error: "stt_failed" };
  }
}
