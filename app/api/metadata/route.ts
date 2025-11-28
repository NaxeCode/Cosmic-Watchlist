import { NextResponse } from "next/server";
import { fetchMetadata } from "@/lib/metadata";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "").trim();
  const type = (searchParams.get("type") || "movie").trim();

  if (!title) {
    return NextResponse.json({ ok: false, error: "Missing title" }, { status: 400 });
  }

  const meta = await fetchMetadata(title, type);
  if (!meta) {
    return NextResponse.json({ ok: false, error: "No metadata found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, metadata: meta });
}
