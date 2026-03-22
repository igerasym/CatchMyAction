import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/** GET /api/uploads/* — serve uploaded files from local storage */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(process.cwd(), "public", "uploads", ...params.path);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg"
    : ext === ".png" ? "image/png"
    : ext === ".webp" ? "image/webp"
    : ext === ".svg" ? "image/svg+xml"
    : "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
