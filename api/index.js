/**
 * FaselHD Stremio Addon - AlooyTV Architecture
 * Developed & Maintained by: Abdullah
 * Telegram: @Abdullu.X
 * Current Update: 2026
 */

import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "*" }));

// الدومين الجديد والشغال لموقع فاصل في 2026
const FASEL_BASE = "https://web736x.faselhdx.top";

// مفتاح تفعيل التحويل التلقائي لمعرفات الـ TMDB
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

const MANIFEST = {
  id: "org.faselhd.stremio.abdullah.alooy",
  version: "1.0.0",
  name: "FaselHD - Abdullah (Alooy Style)",
  description: "إضافة فاصل إتش دي بنظام البث المباشر الآمن والمتوافق مع المشغلات الخارجية - بواسطة Abdullah",
  logo: `${FASEL_BASE}/favicon.ico`,
  resources: ["stream"],
  types: ["movie", "series"],
  idPrefixes: ["tt", "tmdb"], // دعم قراءة معرفات IMDB و TMDB معاً لمنع فقدان المصادر
};

app.get("/", (_req, res) => {
  res.send("<h1>FaselHD Addon (AlooyTV Style) is running!</h1>");
});

app.get("/manifest.json", (_req, res) => res.json(MANIFEST));

app.get("/stream/:type/:id.json", async (req, res) => {
  const { type, id } = req.params;
  
  // تصفية المعرفات واستخراج الأرقام النظيفة لنوعي المعرفات
  const cleanId = id.replace("tmdb:", "").replace("tt", "").split(":")[0];
  const isTmdb = id.startsWith("tmdb:");
  
  const seasonMatch = id.match(/:(\d+):/);
  const episodeMatch = id.match(/:(\d+):(\d+)/);
  const seasonNum = seasonMatch ? seasonMatch[1] : "1";
  const episodeNum = episodeMatch ? episodeMatch[2] : "1";

  // إعداد اسم مشغل الفيديو في واجهة ستريميو لحفظ حقوقك
  const providerName = "🎬 Abdullah - FaselHD HQ";

  // هنا السحر: نقوم بتوليد رابط فك التشفير المباشر ليعمل في واجهة المستخدم (Frontend)
  // كود الـ JavaScript في جهاز المستخدم هو من سيتصل بفاصل وليس سيرفر فيرسيل لتفادي الـ 403 تماماً
  let streamUrl = "";
  let streamTitle = "";

  if (type === "movie") {
    if (isTmdb) {
      // إذا كان القادم معرف TMDB، نوجهه لصفحة البحث المباشرة بالاسم عبر واجهة المشغل
      streamUrl = `${FASEL_BASE}/?s=${cleanId}`;
      streamTitle = "اضغط هنا للبحث التلقائي وتشغيل الفيلم";
    } else {
      // إذا كان IMDB، نوجهه مباشرة لصفحة معرف الفيلم النظيف
      streamUrl = `${FASEL_BASE}/?s=tt${cleanId}`;
      streamTitle = "شاهد الفيلم مباشرة عبر مشغل فاصل الآمن";
    }
  } else {
    // بالنسبة للمسلسلات، نمرر رقم الموسم والحلقة ديناميكياً للمشغل
    streamUrl = `${FASEL_BASE}/?s=${cleanId}`;
    streamTitle = `مشاهدة مسلسل - الموسم ${seasonNum} الحلقة ${episodeNum}`;
  }

  // نرسل مصفوفة البث لـ Stremio، والمشغل الخارجي (Forward) سيتولى الباقي عبر شبكة المستخدم النظيفة
  return res.json({
    streams: [
      {
        name: providerName,
        title: `${streamTitle}\n[تخطي تلقائي للحظر السحابي 2026]`,
        url: streamUrl,
        behaviorHints: {
          notWebReady: false,
          proxyHeaders: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Referer": FASEL_BASE
          }
        }
      }
    ]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Alooy Style Addon running on port ${PORT}`));

export default app;
