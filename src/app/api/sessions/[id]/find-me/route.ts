import { NextRequest, NextResponse } from "next/server";
import { searchFacesBySelfie } from "@/lib/rekognition";
import { getAuthUser } from "@/lib/auth-helpers";

/** POST /api/sessions/:id/find-me — search for faces matching a selfie */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getAuthUser();
  if (user instanceof NextResponse) return user;

  try {
    const formData = await req.formData();
    const file = formData.get("selfie") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Selfie image required" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Selfie too large (max 5MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const matches = await searchFacesBySelfie(params.id, buffer);

    return NextResponse.json({
      matches,
      count: matches.length,
    });
  } catch (err: any) {
    if (err.name === "InvalidParameterException") {
      return NextResponse.json({ error: "No face detected in selfie. Try a clearer photo.", matches: [], count: 0 }, { status: 200 });
    }
    if (err.name === "ResourceNotFoundException") {
      return NextResponse.json({ error: "Face search not available for this session yet. Photos need to be re-uploaded.", matches: [], count: 0 }, { status: 200 });
    }
    console.error("Find-me error:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
