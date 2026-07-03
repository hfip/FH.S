/**
 * FaselHD Stremio Addon - V2 (Safe Cloud Edition)
 * Developed & Maintained by: Abdullah
 * Telegram: @Abdullu.X
 */

import express from "express";
import cors from "cors";
import axios from "axios";
import { load } from "cheerio";

const app = express();
app.use(cors({ origin: "*" }));

// الدومين الجديد والشغال لموقع فاصل في 2026
const FASEL_BASE = "https://web736x.faselhdx.top";

// رابط البروكسي الحالي لتخطي جدار الحماية
const PROXY_URL = "https://faseldhdproxy-hq1a.vercel.app/?url=";

const MANIFEST = {
  id: "org.faselhd.stremio.abdullah",
  version: "1.0.0",
  name: "FaselHD - Abdullah",
  description: "شاهد الأفلام والمسلسلات العربية والأجنبية مباشرة من فاصل إتش دي - بواسطة Abdullah",
  logo: `${FASEL_BASE}/favicon.ico`,
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt"], // قراءة المعرفات الرسمية لـ IMDB
};

// دالة جلب محتوى الصفحات عبر البروكسي
async function fetchHtml(url) {
  try {
    const finalUrl = PROXY_URL + encodeURIComponent(url);
    const res = await axios.get(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0", "Referer": FASEL_BASE },
      timeout: 10000
    });
    return res.data;
  } catch (err) {
    console.error(`[Fetch Error] URL: ${url} -> ${err.message}`);
    return null;
  }
}

// الصفحة الرئيسية
app.get("/", (_req, res) => {
  res.send("<h1>FaselHD Stremio Addon is running successfully!</h1><p>Load <a href='/manifest.json'>/manifest.json</a> in Stremio.</p>");
});

// ميثود المانيفست
app.get("/manifest.json", (_req, res) => res.json(MANIFEST));

// ميثود البث (Stream) - تبحث في فاصل باستخدام معرف الـ IMDB
app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  
  // استخراج الـ IMDB ID النظيف (مثال: tt1254207)
  const imdbId = id.split(":")[0];
  const seasonMatch = id.match(/:(\d+):/);
  const episodeMatch = id.match(/:(\d+):(\d+)/);
  
  const seasonNum = seasonMatch ? seasonMatch[1] : null;
  const episodeNum = episodeMatch ? episodeMatch[2] : null;

  console.log(`[Stream Request] Type: ${type}, IMDB: ${imdbId}, Season: ${seasonNum}, Episode: ${episodeNum}`);

  try {
    // 1. البحث عن المحتوى داخل فاصل باستخدام معرف الـ IMDB
    const searchUrl = `${FASEL_BASE}/?s=${imdbId}`;
    const searchHtml = await fetchHtml(searchUrl);
    if (!searchHtml) return res.json({ streams: [] });

    const $search = load(searchHtml);
    let targetUrl = $search("div.postDiv a").first().attr("href");

    if (!targetUrl) {
      return res.json({ streams: [] });
    }

    if (targetUrl.startsWith("/")) targetUrl = FASEL_BASE + targetUrl;

    // 2. إذا كان المحتوى مسلسل، يجب الدخول لصفحة الحلقة المطلوبة
    if (type === "series" && episodeNum) {
      const mainPageHtml = await fetchHtml(targetUrl);
      if (mainPageHtml) {
        const $main = load(mainPageHtml);
        let epFoundUrl = null;
        
        $main("a").each((_i, el) => {
          const text = $main(el).text().trim();
          const href = $main(el).attr("href");
          if (text === `الحلقة ${episodeNum}` && href) {
            epFoundUrl = href;
          }
        });

        if (epFoundUrl) {
          targetUrl = epFoundUrl.startsWith("http") ? epFoundUrl : `${FASEL_BASE}${epFoundUrl}`;
        }
      }
    }

    // 3. الدخول لصفحة المشاهدة النهائية واستخراج رابط الـ m3u8
    const watchHtml = await fetchHtml(targetUrl);
    if (!watchHtml) return res.json({ streams: [] });

    const $watch = load(watchHtml);
    let playerUrl = null;

    // البحث عن زر المشاهدة (video_player)
    $watch("ul.tabs-ul li").each((_i, el) => {
      const onclick = $watch(el).attr("onclick");
      if (onclick && onclick.includes("/video_player")) {
        const match = onclick.match(/\/video_player[^'"]+/);
        if (match) playerUrl = FASEL_BASE + match[0];
      }
    });

    if (playerUrl) {
      const playerHtml = await fetchHtml(playerUrl);
      if (playerHtml) {
        // فك واستخراج رابط ملف الـ m3u8 من المشغل المباشر لفاصل
        const fileMatch = playerHtml.match(/file:\s*"([^"]+\.m3u8)"/);
        if (fileMatch && fileMatch[1]) {
          const m3u8Url = fileMatch[1];
          return res.json({
            streams: [
              {
                name: "🎬 FaselHD - High Quality",
                title: type === "series" ? `الحلقة ${episodeNum} - متاح البث المباشر` : "شاهد الفيلم بجودة عالية",
                url: m3u8Url,
                behaviorHints: { notWebReady: false }
              }
            ]
          });
        }
      }
    }

    return res.json({ streams: [] });
  } catch (err) {
    console.error(`[Stream Endpoint Error]: ${err.message}`);
    return res.json({ streams: [] });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Addon running on port ${PORT}`));

export default app;
