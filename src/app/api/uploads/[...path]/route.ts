import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

/** GET /api/uploads/* — serve uploaded files from local storage */
export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Reject path segments that try to escape (.. or absolute paths)
  if (params.path.some((seg) => seg === ".." || seg.startsWith("/") || seg.includes("\0"))) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = path.resolve(UPLOADS_ROOT, ...params.path);

  // Ensure resolved path is still within uploads directory
  if (!filePath.startsWith(UPLOADS_ROOT)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

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
