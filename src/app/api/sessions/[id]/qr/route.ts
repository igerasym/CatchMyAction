import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/** GET /api/sessions/:id/qr — generate QR code SVG */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const sessionUrl = `${baseUrl}/sessions/${params.id}`;

  const svg = await QRCode.toString(sessionUrl, {
    type: "svg",
    color: { dark: "#000000", light: "#ffffff" },
    margin: 1,
    width: 256,
  });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
