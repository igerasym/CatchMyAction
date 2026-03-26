import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth-helpers";

/** GET /api/user?id=xxx — public profile fields only, or full profile if own user */
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Check if requester is the same user (gets full profile)
  const authUser = await getAuthUser();
  const isSelf = !(authUser instanceof NextResponse) && authUser.id === id;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (isSelf) {
    // Own profile — return everything except passwordHash and verifyToken
    const { passwordHash, verifyToken, ...safeUser } = user as any;
    return NextResponse.json(safeUser);
  }

  // Public profile — only safe fields
  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    website: user.website,
    instagram: user.instagram,
    youtube: user.youtube,
    tiktok: user.tiktok,
    createdAt: user.createdAt,
  });
}

/** PATCH /api/user — update profile (authenticated, own user only) */
export async function PATCH(req: NextRequest) {
  const authUser = await getAuthUser();
  if (authUser instanceof NextResponse) return authUser;

  const body = await req.json();
  const { id, name, email, role, currentPassword, newPassword, bio, website, instagram, youtube, tiktok, avatarUrl } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // Verify the authenticated user is updating their own profile
  if (authUser.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id } }) as any;
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, any> = {};

  if (name && name !== user.name) data.name = name;
  if (bio !== undefined && bio !== user.bio) data.bio = bio;
  if (website !== undefined && website !== user.website) data.website = website;
  if (instagram !== undefined && instagram !== user.instagram) data.instagram = instagram;
  if (youtube !== undefined && youtube !== user.youtube) data.youtube = youtube;
  if (tiktok !== undefined && tiktok !== user.tiktok) data.tiktok = tiktok;
  if (avatarUrl !== undefined && avatarUrl !== user.avatarUrl) data.avatarUrl = avatarUrl;

  if (email && email !== user.email) {
    // Email changes disabled
    return NextResponse.json({ error: "Email cannot be changed" }, { status: 400 });
  }

  // Role upgrade: USER → PHOTOGRAPHER (requires password confirmation)
  if (role === "PHOTOGRAPHER" && user.role === "USER") {
    if (!currentPassword) {
      return NextResponse.json({ error: "Password required to upgrade account" }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "No password set" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }
    data.role = "PHOTOGRAPHER";
  }

  // Role downgrade: PHOTOGRAPHER → USER
  if (role === "USER" && user.role === "PHOTOGRAPHER") {
    if (!currentPassword) {
      return NextResponse.json({ error: "Password required to downgrade account" }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "No password set" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 403 });
    }
    data.role = "USER";
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password required" }, { status: 400 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "No password set" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
    const { validatePassword } = await import("@/lib/validation");
    const pwError = validatePassword(newPassword);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No changes" });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated);
}
