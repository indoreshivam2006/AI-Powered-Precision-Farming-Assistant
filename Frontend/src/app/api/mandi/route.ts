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

  if (!apiKey) {
    return NextResponse.json(
      { error: "DATA_GOV_API_KEY not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const commodity = searchParams.get("commodity");
  const state = searchParams.get("state");
  const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit)
    ? String(Math.min(Math.max(requestedLimit, 1), 100))
    : "20";

  // Build query params for data.gov.in
  const params = new URLSearchParams({
    "api-key": apiKey,
    format: "json",
    offset: searchParams.get("offset") || "0",
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
      const error = toDataGovError(res.status, data);
      console.error("data.gov.in error:", res.status, data);
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (!data || data.status === "error") {
      const error = toDataGovError(502, data);
      console.error("data.gov.in payload error:", data);
      return NextResponse.json({ error: error.message }, { status: error.status });
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

    return NextResponse.json({
      total: data.total || records.length,
      updated: data.updated_date || new Date().toISOString(),
      records,
    });
  } catch (err) {
    console.error("Mandi API fetch error:", err);
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "data.gov.in request timed out. Please retry."
        : "Failed to fetch mandi prices from data.gov.in.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
