import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

const PORT = process.env.PORT || 3000;
const CACHE_TTL = 1000 * 60 * 60 * 12;
const cache = new Map();

const ENDPOINTS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];

const activityMap = {
  pharmacy: ['["amenity"="pharmacy"]'],
  hospital: [
    '["amenity"="hospital"]',
    '["healthcare"="clinic"]',
    '["healthcare"="hospital"]'
  ],
  restaurant: [
    '["amenity"="restaurant"]',
    '["amenity"="cafe"]'
  ],
  hotel: ['["tourism"="hotel"]'],
  bank: ['["amenity"="bank"]'],
  accounting: ['["office"="accountant"]'],
  legal: ['["office"="lawyer"]'],
  real_estate: ['["office"="estate_agent"]'],
  car: [
    '["shop"="car"]',
    '["shop"="car_repair"]',
    '["shop"="car_parts"]'
  ],
  supermarket: [
    '["shop"="supermarket"]',
    '["shop"="convenience"]'
  ],
  it: [
    '["office"="it"]',
    '["shop"="computer"]'
  ],
  travel: [
    '["shop"="travel_agency"]',
    '["office"="travel_agent"]'
  ]
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

const clean = s =>
  String(s || "")
    .replace(/["\\]/g, "")
    .trim()
    .slice(0, 100);

function countryArea(cc) {
  return `area["ISO3166-1"="${cc}"][admin_level=2]->.searchArea;`;
}

function regionArea(cc, region) {
  const r = clean(region);

  return `
area["ISO3166-1"="${cc}"][admin_level=2]->.country;
(
 area(area.country)["boundary"="administrative"]["name"="${r}"];
 area(area.country)["boundary"="administrative"]["name:ar"="${r}"];
 area(area.country)["boundary"="administrative"]["name:en"="${r}"];
)->.searchArea;`;
}

function buildQuery(cc, region, filter, keyword, useRegion) {

  cc = String(cc || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);

  const nf = clean(keyword)
    ? `["name"~"${clean(keyword)}",i]`
    : "";

  const area =
    useRegion && region
      ? regionArea(cc, region)
      : countryArea(cc);

  return `[out:json][timeout:18];
${area}
(
 nwr${filter}${nf}(area.searchArea);
);
out tags center 120;`;
}

async function fetchJSON(
  endpoint,
  query,
  timeoutMs = 24000
) {

  const ctrl = new AbortController();

  const timer = setTimeout(
    () => ctrl.abort(),
    timeoutMs
  );

  try {

    const r = await fetch(endpoint, {
      method: "POST",

      headers: {
        "content-type":
          "application/x-www-form-urlencoded;charset=UTF-8",

        "accept":
          "application/json",

        "user-agent":
          "SWP-Business-Data/1.1"
      },

      body:
        "data=" + encodeURIComponent(query),

      signal: ctrl.signal
    });

    if (!r.ok) {
      throw new Error(
        "HTTP " + r.status
      );
    }

    return await r.json();

  } catch (e) {

    if (e.name === "AbortError") {
      throw new Error("TIMEOUT");
    }

    throw e;

  } finally {

    clearTimeout(timer);
  }
}

async function runQuery(query) {

  const attempts = [];

  for (const endpoint of ENDPOINTS) {

    try {

      const data =
        await fetchJSON(
          endpoint,
          query
        );

      attempts.push({
        endpoint,
        ok: true,
        count:
          data?.elements?.length || 0
      });

      return {
        data,
        attempts
      };

    } catch (e) {

      attempts.push({
        endpoint,
        ok: false,
        error:
          String(
            e.message || e
          )
      });

      await sleep(500);
    }
  }

  return {
    data: null,
    attempts
  };
}

function normalize(
  elements,
  activity,
  country,
  region
) {

  const out = [];
  const seen = new Set();

  for (const x of elements || []) {

    const t = x.tags || {};

    const name =
      t.name ||
      t["name:ar"] ||
      t["name:en"];

    if (!name) {
      continue;
    }

    const phone =
      t.phone ||
      t["contact:phone"] ||
      "";

    const mobile =
      t.mobile ||
      t["contact:mobile"] ||
      "";

    const website =
      t.website ||
      t["contact:website"] ||
      "";

    const email =
      t.email ||
      t["contact:email"] ||
      "";

    const key =
      (
        name +
        "|" +
        phone +
        "|" +
        mobile +
        "|" +
        website
      ).toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    out.push({
      country,
      region,
      name,
      activity,
      email,
      phone,
      mobile,
      website,
      source: "OpenStreetMap"
    });
  }

  return out;
}

function dedupe(rows) {

  const seen = new Set();

  return rows.filter(r => {

    const k =
      (
        r.name +
        "|" +
        r.phone +
        "|" +
        r.mobile +
        "|" +
        r.website
      ).toLowerCase();

    if (seen.has(k)) {
      return false;
    }

    seen.add(k);

    return true;
  });
}

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true,
      service:
        "SWP Business Data API",
      version: "1.1"
    });
  }
);

app.get(
  "/api/search",
  async (req, res) => {

    const cc =
      String(
        req.query.country || ""
      ).toUpperCase();

    const region =
      clean(
        req.query.region
      );

    const activity =
      clean(
        req.query.activity
      );

    const keyword =
      clean(
        req.query.keyword
      );

    const countryName =
      clean(
        req.query.countryName
      ) || cc;

    if (
      !/^[A-Z]{2}$/.test(cc) ||
      !activity
    ) {

      return res
        .status(400)
        .json({
          ok: false,
          error:
            "country and activity are required"
        });
    }

    const cacheKey =
      [
        cc,
        region,
        activity,
        keyword
      ]
        .join("|")
        .toLowerCase();

    const hit =
      cache.get(cacheKey);

    if (
      hit &&
      Date.now() - hit.time <
        CACHE_TTL
    ) {

      return res.json({
        ...hit.data,
        cached: true
      });
    }

    const filters =
      activityMap[activity] ||
      [
        `["name"~"${clean(activity)}",i]`
      ];

    let all = [];

    const diagnostics = [];

    let usedFallback = false;

    // البحث أولاً داخل المحافظة
    if (region) {

      for (
        const filter of filters
      ) {

        const result =
          await runQuery(
            buildQuery(
              cc,
              region,
              filter,
              keyword,
              true
            )
          );

        diagnostics.push({
          scope: "region",
          filter,
          attempts:
            result.attempts
        });

        if (result.data) {

          all.push(
            ...normalize(
              result.data.elements,
              activity,
              countryName,
              region
            )
          );
        }

        await sleep(250);
      }
    }

    // إذا لم نجد نتائج
    // يتم البحث على مستوى الدولة
    if (!all.length) {

      usedFallback =
        !!region;

      for (
        const filter of filters
      ) {

        const result =
          await runQuery(
            buildQuery(
              cc,
              "",
              filter,
              keyword,
              false
            )
          );

        diagnostics.push({
          scope: "country",
          filter,
          attempts:
            result.attempts
        });

        if (result.data) {

          all.push(
            ...normalize(
              result.data.elements,
              activity,
              countryName,
              region
            )
          );
        }

        await sleep(250);
      }
    }

    all =
      dedupe(all);

    const anySourceSucceeded =
      diagnostics.some(
        d =>
          d.attempts.some(
            a => a.ok
          )
      );

    const failures =
      diagnostics.flatMap(
        d =>
          d.attempts
            .filter(
              a => !a.ok
            )
            .map(
              a =>
                `${d.scope}: ${a.error}`
            )
      );

    const data = {

      ok:
        anySourceSucceeded,

      count:
        all.length,

      results:
        all,

      fallbackToCountry:
        usedFallback,

      warnings:
        [
          ...new Set(
            failures
          )
        ].slice(0, 8),

      message:
        all.length
          ? (
              usedFallback
                ? "تعذر الحصول على نتائج كافية للمحافظة، لذلك تم استخدام نطاق الدولة تلقائيًا."
                : "تم تحميل النتائج."
            )
          : (
              anySourceSucceeded
                ? "المصادر استجابت ولكن لم توجد نتائج مطابقة لهذا النشاط/النطاق."
                : "تعذر الوصول إلى جميع مصادر البيانات."
            )
    };

    if (all.length) {

      cache.set(
        cacheKey,
        {
          time:
            Date.now(),

          data
        }
      );
    }

    return res
      .status(
        anySourceSucceeded
          ? 200
          : 503
      )
      .json(data);
  }
);

app.listen(
  PORT,
  () =>
    console.log(
      `SWP API v1.1 running on ${PORT}`
    )
);
