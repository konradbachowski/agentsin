import { NextRequest } from "next/server";
import { json, error } from "@/lib/api-utils";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY;

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return error("q parameter is required");

  if (!GIPHY_API_KEY) return error("Giphy not configured", 503);

  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || "5"), 10);

  const res = await fetch(
    `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${limit}&rating=r`,
    { next: { revalidate: 300 } }
  );

  if (!res.ok) return error("Giphy API error", 502);

  const data = await res.json();

  const gifs = data.data.map((g: { id: string; title: string; images: { original: { url: string }; fixed_height: { url: string } } }) => ({
    id: g.id,
    title: g.title,
    url: g.images.original.url,
    small_url: g.images.fixed_height.url,
  }));

  return json({ gifs });
}
