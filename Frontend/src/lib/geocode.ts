/**
 * Reverse-geocode utility using Nominatim (OpenStreetMap).
 *
 * Features:
 *  - Free, no API key required.
 *  - Extracts road, area (neighbourhood/suburb), city, and abbreviated state.
 *  - In-memory + sessionStorage cache so the same lat/lng is never fetched twice.
 *  - Robust error handling with typed result.
 */

/* ── Indian State Abbreviations ─────────────────────────────────────── */

const STATE_ABBR: Record<string, string> = {
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  "assam": "AS",
  "bihar": "BR",
  "chhattisgarh": "CG",
  "goa": "GA",
  "gujarat": "GJ",
  "haryana": "HR",
  "himachal pradesh": "HP",
  "jharkhand": "JH",
  "karnataka": "KA",
  "kerala": "KL",
  "madhya pradesh": "MP",
  "maharashtra": "MH",
  "manipur": "MN",
  "meghalaya": "ML",
  "mizoram": "MZ",
  "nagaland": "NL",
  "odisha": "OD",
  "punjab": "PB",
  "rajasthan": "RJ",
  "sikkim": "SK",
  "tamil nadu": "TN",
  "telangana": "TG",
  "tripura": "TR",
  "uttar pradesh": "UP",
  "uttarakhand": "UK",
  "west bengal": "WB",
  /* Union Territories */
  "andaman and nicobar islands": "AN",
  "chandigarh": "CH",
  "dadra and nagar haveli and daman and diu": "DD",
  "delhi": "DL",
  "jammu and kashmir": "JK",
  "ladakh": "LA",
  "lakshadweep": "LD",
  "puducherry": "PY",
};

function abbreviateState(fullName: string): string {
  return STATE_ABBR[fullName.toLowerCase().trim()] ?? fullName;
}

/* ── Types ──────────────────────────────────────────────────────────── */

export type LocationInfo = {
  /** Full formatted string, e.g. "Kolar Road, Kolar, Bhopal, MP" */
  formatted: string;
  road: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  /** Abbreviated state, e.g. "MP" */
  stateShort: string | null;
  /** Raw lat/lng used for this lookup */
  lat: number;
  lng: number;
};

/* ── In-memory cache ────────────────────────────────────────────────── */

const memCache = new Map<string, LocationInfo>();

function cacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places (~11 m precision) for cache deduplication
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function getFromCache(lat: number, lng: number): LocationInfo | null {
  const key = cacheKey(lat, lng);

  // 1. Check in-memory cache first
  const mem = memCache.get(key);
  if (mem) return mem;

  // 2. Check sessionStorage (survives soft navigations)
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`geo:${key}`);
      if (stored) {
        const parsed: LocationInfo = JSON.parse(stored);
        memCache.set(key, parsed); // promote to memory
        return parsed;
      }
    } catch {
      // sessionStorage not available or corrupt — ignore
    }
  }

  return null;
}

function setCache(info: LocationInfo): void {
  const key = cacheKey(info.lat, info.lng);
  memCache.set(key, info);

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`geo:${key}`, JSON.stringify(info));
    } catch {
      // quota exceeded — ignore
    }
  }
}

/* ── Main function ──────────────────────────────────────────────────── */

/**
 * Reverse-geocode a lat/lng pair into a human-readable Indian location.
 *
 * @example
 * const loc = await reverseGeocode(23.27, 77.49);
 * console.log(loc.formatted); // "Kolar Road, Kolar, Bhopal, MP"
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<LocationInfo> {
  // Check cache first
  const cached = getFromCache(lat, lng);
  if (cached) return cached;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8 s timeout

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`,
      {
        headers: {
          // Nominatim requires a meaningful User-Agent
          "User-Agent": "KisanMitra/1.0 (farming-advisory-app)",
        },
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      throw new Error(`Nominatim returned ${res.status}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(data.error); // e.g. "Unable to geocode"
    }

    const addr = data.address ?? {};

    const road: string | null = addr.road ?? null;
    const area: string | null =
      addr.neighbourhood ?? addr.suburb ?? addr.hamlet ?? null;
    const city: string | null =
      addr.city ?? addr.town ?? addr.village ?? addr.county ?? null;
    const state: string | null = addr.state ?? null;
    const stateShort = state ? abbreviateState(state) : null;

    // Build formatted string from available parts
    const parts = [road, area, city, stateShort].filter(Boolean);
    const formatted = parts.length > 0 ? parts.join(", ") : `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;

    const info: LocationInfo = {
      formatted,
      road,
      area,
      city,
      state,
      stateShort,
      lat,
      lng,
    };

    setCache(info);
    return info;
  } catch (err: unknown) {
    // On failure, return a graceful fallback with raw coordinates
    const fallback: LocationInfo = {
      formatted: `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`,
      road: null,
      area: null,
      city: null,
      state: null,
      stateShort: null,
      lat,
      lng,
    };

    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn("Nominatim request timed out for", lat, lng);
    } else {
      console.error("Reverse geocoding failed:", err);
    }

    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Convenience: get just the formatted location string.
 */
export async function getLocationName(lat: number, lng: number): Promise<string> {
  const info = await reverseGeocode(lat, lng);
  return info.formatted;
}
