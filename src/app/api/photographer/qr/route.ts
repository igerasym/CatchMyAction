import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getAuthUser } from "@/lib/auth-helpers";

/** GET /api/photographer/qr — generate photographer profile QR code */
export async function GET() {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const profileUrl = `${baseUrl}/photographer/${user.id}`;

  const svg = await QRCode.toString(profileUrl, {
    type: "svg",
    color: { dark: "#000000", light: "#ffffff" },
    margin: 1,
    width: 256,
  });

  return new NextResponse(svg, {
    headers: { "Content-Type": "image/svg+xml" },
  });
}
