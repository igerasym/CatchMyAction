import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { validatePassword, validateEmail, validateEmailDomain } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const { email, password, name, role } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "email, password, and name are required" }, { status: 400 });
  }

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const validDomain = await validateEmailDomain(email);
  if (!validDomain) {
    return NextResponse.json({ error: "Email domain doesn't exist. Please use a real email." }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const verifyToken = randomBytes(32).toString("hex");

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: role === "PHOTOGRAPHER" ? "PHOTOGRAPHER" : "USER",
      verifyToken,
    } as any,
  });

  // Send verification email (non-blocking)
  sendVerificationEmail(email, verifyToken, name).catch(() => {});

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    { status: 201 }
  );
}
