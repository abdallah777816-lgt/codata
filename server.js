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

  all: [
    '["name"]'
  ],

  pharmacy: [
    '["amenity"="pharmacy"]'
  ],

  hospital: [
    '["amenity"="hospital"]',
    '["healthcare"="hospital"]'
  ],

  clinic: [
    '["amenity"="clinic"]',
    '["healthcare"="clinic"]',
    '["healthcare"="doctor"]'
  ],

  laboratory: [
    '["healthcare"="laboratory"]',
    '["healthcare"="diagnostic"]'
  ],

  dentist: [
    '["amenity"="dentist"]',
    '["healthcare"="dentist"]'
  ],

  optician: [
    '["shop"="optician"]'
  ],

  restaurant: [
    '["amenity"="restaurant"]',
    '["amenity"="cafe"]'
  ],

  restaurants_only: [
    '["amenity"="restaurant"]'
  ],

  cafe: [
    '["amenity"="cafe"]'
  ],

  fast_food: [
    '["amenity"="fast_food"]'
  ],

  bakery: [
    '["shop"="bakery"]',
    '["shop"="confectionery"]'
  ],

  butcher: [
    '["shop"="butcher"]'
  ],

  seafood: [
    '["shop"="seafood"]'
  ],

  food: [
    '["shop"="food"]',
    '["shop"="beverages"]',
    '["shop"="deli"]'
  ],

  hotel: [
    '["tourism"="hotel"]'
  ],

  accommodation: [
    '["tourism"="guest_house"]',
    '["tourism"="hostel"]',
    '["tourism"="apartment"]'
  ],

  travel: [
    '["shop"="travel_agency"]',
    '["office"="travel_agent"]'
  ],

  bank: [
    '["amenity"="bank"]'
  ],

  money: [
    '["amenity"="bureau_de_change"]',
    '["shop"="money_lender"]'
  ],

  insurance: [
    '["office"="insurance"]'
  ],

  accounting: [
    '["office"="accountant"]'
  ],

  legal: [
    '["office"="lawyer"]'
  ],

  consulting: [
    '["office"="consulting"]',
    '["office"="company"]'
  ],

  real_estate: [
    '["office"="estate_agent"]'
  ],

  construction: [
    '["office"="construction_company"]',
    '["craft"="builder"]'
  ],

  engineering: [
    '["office"="engineer"]'
  ],

  architect: [
    '["office"="architect"]'
  ],

  interior: [
    '["office"="interior_design"]',
    '["craft"="interior_decorator"]'
  ],

  building_materials: [
    '["shop"="building_materials"]'
  ],

  plumbing: [
    '["shop"="plumbing"]',
    '["craft"="plumber"]'
  ],

  electrical: [
    '["shop"="electrical"]',
    '["craft"="electrician"]'
  ],

  paint: [
    '["shop"="paint"]',
    '["craft"="painter"]'
  ],

  glass: [
    '["craft"="glaziery"]'
  ],

  metal: [
    '["craft"="metal_construction"]',
    '["shop"="hardware"]'
  ],

  wood: [
    '["craft"="carpenter"]',
    '["shop"="doityourself"]'
  ],

  stone: [
    '["craft"="stonemason"]'
  ],

  general_trade: [
    '["office"="company"]',
    '["shop"]'
  ],

  import_export: [
    '["office"="company"]'
  ],

  wholesale: [
    '["shop"="wholesale"]'
  ],

  retail: [
    '["shop"]'
  ],

  supermarket: [
    '["shop"="supermarket"]',
    '["shop"="convenience"]'
  ],

  grocery: [
    '["shop"="convenience"]',
    '["shop"="greengrocer"]'
  ],

  mall: [
    '["shop"="mall"]'
  ],

  market: [
    '["amenity"="marketplace"]'
  ],

  clothes: [
    '["shop"="clothes"]',
    '["shop"="fashion"]'
  ],

  shoes: [
    '["shop"="shoes"]',
    '["shop"="bag"]'
  ],

  jewelry: [
    '["shop"="jewelry"]'
  ],

  accessories: [
    '["shop"="watches"]',
    '["shop"="fashion_accessories"]'
  ],

  beauty_shop: [
    '["shop"="perfumery"]',
    '["shop"="cosmetics"]'
  ],

  furniture: [
    '["shop"="furniture"]'
  ],

  houseware: [
    '["shop"="houseware"]'
  ],

  gift: [
    '["shop"="gift"]'
  ],

  stationery: [
    '["shop"="stationery"]',
    '["shop"="books"]'
  ],

  toys: [
    '["shop"="toys"]'
  ],

  sports: [
    '["shop"="sports"]'
  ],

  car: [
    '["shop"="car"]',
    '["shop"="car_repair"]',
    '["shop"="car_parts"]'
  ],

  car_dealer: [
    '["shop"="car"]'
  ],

  car_parts: [
    '["shop"="car_parts"]'
  ],

  car_repair: [
    '["shop"="car_repair"]'
  ],

  tyres: [
    '["shop"="tyres"]'
  ],

  car_wash: [
    '["amenity"="car_wash"]'
  ],

  fuel: [
    '["amenity"="fuel"]'
  ],

  motorcycle: [
    '["shop"="motorcycle"]'
  ],

  it: [
    '["office"="it"]',
    '["shop"="computer"]'
  ],

  software: [
    '["office"="it"]',
    '["office"="company"]'
  ],

  computer: [
    '["shop"="computer"]',
    '["shop"="electronics"]'
  ],

  mobile: [
    '["shop"="mobile_phone"]'
  ],

  electronics: [
    '["shop"="electronics"]'
  ],

  telecom: [
    '["office"="telecommunication"]',
    '["shop"="mobile_phone"]'
  ],

  advertising: [
    '["office"="advertising_agency"]',
    '["shop"="copyshop"]'
  ],

  photo: [
    '["shop"="photo"]',
    '["craft"="photographer"]'
  ],

  manufacturing: [
    '["industrial"]',
    '["man_made"="works"]'
  ],

  food_factory: [
    '["industrial"="food"]',
    '["craft"="confectionery"]'
  ],

  textile: [
    '["industrial"="textile"]',
    '["craft"="tailor"]'
  ],

  plastic: [
    '["industrial"="plastic"]'
  ],

  chemicals: [
    '["industrial"="chemical"]'
  ],

  pharma_industry: [
    '["industrial"="pharmaceuticals"]'
  ],

  logistics: [
    '["office"="logistics"]',
    '["amenity"="freight_terminal"]'
  ],

  shipping: [
    '["office"="logistics"]',
    '["amenity"="parcel_locker"]'
  ],

  taxi: [
    '["amenity"="taxi"]'
  ],

  car_rental: [
    '["amenity"="car_rental"]'
  ],

  warehouse: [
    '["building"="warehouse"]',
    '["landuse"="industrial"]'
  ],

  agriculture: [
    '["landuse"="farmyard"]',
    '["office"="agriculture"]'
  ],

  garden: [
    '["shop"="garden_centre"]'
  ],

  animal_feed: [
    '["shop"="agrarian"]'
  ],

  poultry: [
    '["produce"="poultry"]',
    '["landuse"="farmyard"]'
  ],

  fish_farm: [
    '["landuse"="aquaculture"]'
  ],

  veterinary: [
    '["amenity"="veterinary"]'
  ],

  school: [
    '["amenity"="school"]'
  ],

  kindergarten: [
    '["amenity"="kindergarten"]'
  ],

  college: [
    '["amenity"="college"]',
    '["amenity"="university"]'
  ],

  training: [
    '["office"="educational_institution"]'
  ],

  language: [
    '["amenity"="language_school"]'
  ],

  fitness: [
    '["leisure"="fitness_centre"]',
    '["leisure"="sports_centre"]'
  ],

  hairdresser: [
    '["shop"="hairdresser"]'
  ],

  beauty: [
    '["shop"="beauty"]',
    '["leisure"="spa"]'
  ],

  laundry: [
    '["shop"="laundry"]',
    '["shop"="dry_cleaning"]'
  ],

  cleaning: [
    '["office"="cleaning"]'
  ],

  security: [
    '["office"="security"]'
  ],

  repair: [
    '["shop"="repair"]',
    '["craft"]'
  ],

  plumber: [
    '["craft"="plumber"]'
  ],

  electrician: [
    '["craft"="electrician"]'
  ],

  hvac: [
    '["craft"="hvac"]'
  ],

  elevator: [
    '["craft"="elevator"]'
  ],

  organization: [
    '["office"="ngo"]',
    '["office"="association"]'
  ],

  public_service: [
    '["office"="government"]',
    '["amenity"="townhall"]'
  ],

  religion: [
    '["amenity"="place_of_worship"]'
  ],

  entertainment: [
    '["amenity"="cinema"]',
    '["leisure"="amusement_arcade"]'
  ],

  club: [
    '["club"]'
  ],

  other: [
    '["office"]',
    '["shop"]',
    '["craft"]'
  ]
};

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

const clean = s =>
  String(s || "")
    .replace(/["\\]/g, "")
    .trim()
    .slice(0, 100);

function countryArea(cc) {

  return `
area["ISO3166-1"="${cc}"][admin_level=2]
  ->.searchArea;
`;
}

function regionArea(cc, region) {

  const r = clean(region);

  return `
area["ISO3166-1"="${cc}"][admin_level=2]
  ->.country;

(
  area(area.country)
    ["boundary"="administrative"]
    ["name"="${r}"];

  area(area.country)
    ["boundary"="administrative"]
    ["name:ar"="${r}"];

  area(area.country)
    ["boundary"="administrative"]
    ["name:en"="${r}"];
)
->.searchArea;
`;
}

function buildQuery(
  cc,
  region,
  filters,
  keyword,
  useRegion
) {

  cc = String(cc || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);

  const safeKeyword = clean(keyword);

  const nameFilter =
    safeKeyword
      ? `["name"~"${safeKeyword}",i]`
      : "";

  const area =
    useRegion && region
      ? regionArea(cc, region)
      : countryArea(cc);

  const list =
    Array.isArray(filters)
      ? filters
      : [filters];

  const clauses =
    list
      .map(
        filter =>
          `nwr${filter}${nameFilter}(area.searchArea);`
      )
      .join("\n");

  return `
[out:json][timeout:22];

${area}

(
${clauses}
);

out tags center 250;
`;
}

async function fetchJSON(
  endpoint,
  query,
  timeoutMs = 24000
) {

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {

    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "content-type":
              "application/x-www-form-urlencoded;charset=UTF-8",

            "accept":
              "application/json",

            "user-agent":
              "SWP-Business-Data/1.2"
          },

          body:
            "data=" +
            encodeURIComponent(query),

          signal:
            controller.signal
        }
      );

    if (!response.ok) {

      throw new Error(
        "HTTP " +
        response.status
      );
    }

    return await response.json();

  } catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "TIMEOUT"
      );
    }

    throw error;

  } finally {

    clearTimeout(timer);
  }
}

async function runQuery(query) {

  const attempts = [];

  for (
    const endpoint
    of ENDPOINTS
  ) {

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
          data?.elements?.length ||
          0
      });

      return {
        data,
        attempts
      };

    } catch (error) {

      attempts.push({
        endpoint,
        ok: false,
        error:
          String(
            error.message ||
            error
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

  const output = [];
  const seen = new Set();

  for (
    const element
    of elements || []
  ) {

    const tags =
      element.tags || {};

    const name =
      tags.name ||
      tags["name:ar"] ||
      tags["name:en"];

    if (!name) {
      continue;
    }

    const phone =
      tags.phone ||
      tags["contact:phone"] ||
      "";

    const mobile =
      tags.mobile ||
      tags["contact:mobile"] ||
      "";

    const website =
      tags.website ||
      tags["contact:website"] ||
      "";

    const email =
      tags.email ||
      tags["contact:email"] ||
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

    if (
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);

    output.push({
      country,
      region,
      name,
      activity,
      email,
      phone,
      mobile,
      website,
      source:
        "OpenStreetMap"
    });
  }

  return output;
}

function dedupe(rows) {

  const seen =
    new Set();

  return rows.filter(
    row => {

      const key =
        (
          row.name +
          "|" +
          row.phone +
          "|" +
          row.mobile +
          "|" +
          row.website
        ).toLowerCase();

      if (
        seen.has(key)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    }
  );
}

app.get(
  "/api/health",
  (req, res) => {

    res.json({
      ok: true,
      service:
        "SWP Business Data API",
      version:
        "1.2"
    });
  }
);

app.get(
  "/api/search",
  async (req, res) => {

    const cc =
      String(
        req.query.country ||
        ""
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

    const cached =
      cache.get(cacheKey);

    if (
      cached &&
      Date.now() -
        cached.time <
        CACHE_TTL
    ) {

      return res.json({
        ...cached.data,
        cached: true
      });
    }

    const filters =
      activityMap[activity] ||
      [
        `["name"~"${clean(activity)}",i]`
      ];

    let results = [];

    const diagnostics = [];

    let usedFallback =
      false;

    // 1 - البحث داخل المحافظة
    if (region) {

      const result =
        await runQuery(
          buildQuery(
            cc,
            region,
            filters,
            keyword,
            true
          )
        );

      diagnostics.push({
        scope: "region",
        activity,
        attempts:
          result.attempts
      });

      if (result.data) {

        results.push(
          ...normalize(
            result.data.elements,
            activity,
            countryName,
            region
          )
        );
      }
    }

    // 2 - إذا لم نجد نتائج
    // نبحث على مستوى الدولة
    if (!results.length) {

      usedFallback =
        Boolean(region);

      const result =
        await runQuery(
          buildQuery(
            cc,
            "",
            filters,
            keyword,
            false
          )
        );

      diagnostics.push({
        scope: "country",
        activity,
        attempts:
          result.attempts
      });

      if (result.data) {

        results.push(
          ...normalize(
            result.data.elements,
            activity,
            countryName,
            region
          )
        );
      }
    }

    results =
      dedupe(results);

    const anySourceSucceeded =
      diagnostics.some(
        item =>
          item.attempts.some(
            attempt =>
              attempt.ok
          )
      );

    const failures =
      diagnostics.flatMap(
        item =>
          item.attempts
            .filter(
              attempt =>
                !attempt.ok
            )
            .map(
              attempt =>
                `${item.scope}: ${attempt.error}`
            )
      );

    const data = {

      ok:
        anySourceSucceeded,

      count:
        results.length,

      results,

      fallbackToCountry:
        usedFallback,

      warnings:
        [
          ...new Set(
            failures
          )
        ].slice(0, 8),

      message:
        results.length
          ? (
              usedFallback
                ? "تم العثور على النتائج باستخدام البحث الموسع على مستوى الدولة."
                : "تم تحميل النتائج بنجاح."
            )
          : (
              anySourceSucceeded
                ? "المصادر استجابت ولكن لم توجد نتائج مطابقة لهذا النشاط والنطاق."
                : "تعذر الوصول إلى جميع مصادر البيانات."
            )
    };

    if (
      results.length
    ) {

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
  () => {

    console.log(
      `SWP API v1.2 running on ${PORT}`
    );
  }
);
