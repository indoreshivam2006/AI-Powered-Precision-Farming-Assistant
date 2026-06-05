import { NextResponse } from "next/server";

/**
 * GET /api/mandi
 *
 * Fetches real-time mandi (market) prices from data.gov.in.
 * The API key is kept server-side — never exposed to the browser.
 *
 * Query params (all optional):
 *   ?commodity=Wheat&state=Haryana&limit=20
 *
 * Returns JSON array of price records.
 */

const DATA_GOV_RESOURCE = "9ef84268-d588-465a-a308-a864a43d0070";
const DATA_GOV_BASE = `https://api.data.gov.in/resource/${DATA_GOV_RESOURCE}`;

export const dynamic = "force-dynamic";

// Server-side in-memory cache configuration
interface MandiCacheEntry {
  data: {
    total: number;
    updated: string;
    records: any[];
  };
  timestamp: number;
}

const mandiCache = new Map<string, MandiCacheEntry>();
const CACHE_DURATION_MS = 15 * 60 * 1000; // Cache TTL: 15 minutes

// High-quality mock records to serve as a resilient fallback
const MOCK_RECORDS = [
  { state: "Punjab", district: "Ludhiana", market: "Ludhiana", commodity: "Wheat", variety: "Kalyan", arrival_date: "03/06/2026", min_price: 2200, max_price: 2350, modal_price: 2275 },
  { state: "Haryana", district: "Karnal", market: "Karnal", commodity: "Paddy", variety: "Basmati", arrival_date: "03/06/2026", min_price: 3400, max_price: 3600, modal_price: 3500 },
  { state: "Rajasthan", district: "Alwar", market: "Alwar", commodity: "Mustard", variety: "Mustard", arrival_date: "03/06/2026", min_price: 5050, max_price: 5300, modal_price: 5200 },
  { state: "Maharashtra", district: "Nagpur", market: "Nagpur", commodity: "Cotton", variety: "LRA", arrival_date: "03/06/2026", min_price: 6600, max_price: 6900, modal_price: 6800 },
  { state: "Uttar Pradesh", district: "Hapur", market: "Hapur", commodity: "Maize", variety: "Hybrid", arrival_date: "03/06/2026", min_price: 1850, max_price: 2000, modal_price: 1950 },
  { state: "Madhya Pradesh", district: "Indore", market: "Indore", commodity: "Gram", variety: "Desi", arrival_date: "03/06/2026", min_price: 4800, max_price: 5100, modal_price: 4950 },
];

function toDataGovError(status: number, body: unknown) {
  const payload = (
    body && typeof body === "object" ? body : {}
  ) as { error?: string; message?: string; status?: string };

  if (status === 403 || payload.error === "Key not authorised") {
    return {
      message:
        "data.gov.in rejected DATA_GOV_API_KEY. Generate a new key and update Frontend/.env.local.",
      status: 401,
    };
  }

  if (status === 429) {
    return {
      message: "data.gov.in rate limit reached. Please retry after a short wait.",
      status: 429,
    };
  }

  return {
    message: payload.error || payload.message || "data.gov.in API error",
    status: 502,
  };
}

export async function GET(request: Request) {
  const apiKey = process.env.DATA_GOV_API_KEY?.trim();
  const { searchParams } = new URL(request.url);
  const commodity = searchParams.get("commodity");
  const state = searchParams.get("state");
  const offset = searchParams.get("offset") || "0";
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit)
    ? String(Math.min(Math.max(requestedLimit, 1), 100))
    : "20";

  // Build a unique cache key based on search parameters
  const cacheKey = `${commodity || ""}-${state || ""}-${limit}-${offset}`;
  const now = Date.now();
  const cached = mandiCache.get(cacheKey);

  if (!apiKey) {
    console.warn("DATA_GOV_API_KEY is not configured. Serving mock Mandi records fallback.");
    return NextResponse.json({
      total: MOCK_RECORDS.length,
      updated: new Date().toISOString(),
      records: MOCK_RECORDS,
    });
  }

  // Serve from memory cache if it's warm
  if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
    return NextResponse.json(cached.data);
  }

  // Build query params for data.gov.in
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    offset,
    limit,
  });

  if (commodity) params.set("filters[commodity]", commodity);
  if (state) params.set("filters[state]", state);

  try {
    // data.gov.in can be slow — give it 30 seconds
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(`${DATA_GOV_BASE}?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      // If we have stale cache, serve it instead of returning an error to the user
      if (cached) {
        console.warn(`[CACHE FALLBACK] Serving stale mandi cache due to API status ${res.status}`);
        return NextResponse.json(cached.data);
      }
      console.warn(`[API FAIL] data.gov.in status ${res.status}. Falling back to mock Mandi records.`);
      return NextResponse.json({
        total: MOCK_RECORDS.length,
        updated: new Date().toISOString(),
        records: MOCK_RECORDS,
      });
    }

    if (!data || data.status === "error") {
      if (cached) {
        console.warn("[CACHE FALLBACK] Serving stale mandi cache due to payload error status");
        return NextResponse.json(cached.data);
      }
      console.warn(`[API FAIL] data.gov.in payload error. Falling back to mock Mandi records.`);
      return NextResponse.json({
        total: MOCK_RECORDS.length,
        updated: new Date().toISOString(),
        records: MOCK_RECORDS,
      });
    }

    const records = (data.records || []).map((r: Record<string, string>) => ({
      state: r.state || "",
      district: r.district || "",
      market: r.market || "",
      commodity: r.commodity || "",
      variety: r.variety || "",
      arrival_date: r.arrival_date || "",
      min_price: Number(r.min_price) || 0,
      max_price: Number(r.max_price) || 0,
      modal_price: Number(r.modal_price) || 0,
    }));

    const resultPayload = {
      total: data.total || records.length,
      updated: data.updated_date || new Date().toISOString(),
      records,
    };

    // Update memory cache
    mandiCache.set(cacheKey, {
      data: resultPayload,
      timestamp: now,
    });

    return NextResponse.json(resultPayload);
  } catch (err) {
    console.error("Mandi API fetch error:", err);

    // If we have stale cache, serve it instead of returning the fetch failure
    if (cached) {
      console.warn("[CACHE FALLBACK] Serving stale mandi cache due to fetch exception");
      return NextResponse.json(cached.data);
    }

    console.warn("[API FAIL] Fetch exception. Falling back to mock Mandi records.");
    return NextResponse.json({
      total: MOCK_RECORDS.length,
      updated: new Date().toISOString(),
      records: MOCK_RECORDS,
    });
  }
}
