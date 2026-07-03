/**
 * FaselHD Stremio Addon
 * Developed & Maintained by: Abdullah
 * Telegram: @Abdullu.X
 * Current Update: 2026
 */

import express from "express";
import cors from "cors";
import https from "https";
import http from "http";

const app = express();
app.use(cors({ origin: "*" }));

// السيرفر الخلفي الذكي ومفتاح TMDB الشغالين 100%
const BACKEND = "http://145.241.158.129:3112";
const TMDB_KEY = "8265bd1679663a7ea12ac168da84d2e8";
const ICON = "https://raw.githubusercontent.com/hfip/arabic-providers/main/IMG_5223.jpeg";

const MANIFEST = {
  id: "community.faselhdx.abdulluhx.v3",
  version: "3.0.0",
  name: "FaselHD by Abdulluh.X",
  description: "أفلام ومسلسلات عربية وأجنبية بترجمة محروقة - بواسطة Abdullah",
  logo: ICON,
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: [],
  idPrefixes: ["tt"]
};

// دالة جلب البيانات عبر الـ Promise المتوافقة مع السيرفر الخلفي
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      timeout: 30000
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

// دالة تحويل معرف IMDB إلى معرف TMDB الرقمي
async function imdbToTmdb(imdbId, type) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`;
    const data = await fetchUrl(url);
    if (type === "movie" && data.movie_results && data.movie_results.length > 0) {
      return String(data.movie_results[0].id);
    }
    if (type === "series" && data.tv_results && data.tv_results.length > 0) {
      return String(data.tv_results[0].id);
    }
    return null;
  } catch (e) {
    return null;
  }
}

// الواجهة الرئيسية للإضافة
app.get("/", (_req, res) => {
  res.send("<h1>FaselHD Stremio Addon (V3 Engine) is running successfully!</h1>");
});

// ميثود المانيفست الرسمي لـ Stremio
app.get("/manifest.json", (_req, res) => {
  res.json(MANIFEST);
});

// معالج جلب روابط البث الصافية والربط مع الـ Backend
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  
  try {
    const parts = id.split(":");
    const imdbId = parts[0];
    const season = parts[1] || "1";
    const episode = parts[2] || "1";

    // 1. تحويل المعرف القادم من ستريميو إلى رقمي ليفهمه السيرفر الخلفي
    const tmdbId = await imdbToTmdb(imdbId, type);
    if (!tmdbId) {
      console.log(`[FaselHD] Could not find TMDB ID for ${imdbId}`);
      return res.json({ streams: [] });
    }

    // 2. بناء المعرف بالصيغة الرقمية المطلوبة للـ Backend
    let resolveId = tmdbId;
    if (type === "series") {
      resolveId = `${tmdbId}:${season}:${episode}`;
    }

    const backendUrl = `${BACKEND}/resolve/${type}/${resolveId}`;
    console.log(`[FaselHD] Fetching from Backend: ${backendUrl}`);

    // 3. استدعاء السيرفر الخلفي وفك الروابط حية ومباشرة
    const data = await fetchUrl(backendUrl);
    const streams = (data.streams || []).map(s => ({
      name: "🎬 Abdullah - FaselHD HQ",
      title: s.title || "FaselHD",
      url: s.url,
      headers: s.headers || {},
      behaviorHints: { notWebReady: false }
    }));

    console.log(`[FaselHD] Found ${streams.length} stream(s) for IMDB: ${imdbId}`);
    return res.json({ streams });

  } catch (e) {
    console.error(`[FaselHD Error]: ${e.message}`);
    return res.json({ streams: [] });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`V3 Engine running on port ${PORT}`));

export default app;
