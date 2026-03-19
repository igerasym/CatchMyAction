import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password", 12);

  const photographer = await prisma.user.upsert({
    where: { email: "photographer@demo.com" },
    update: { passwordHash: hash },
    create: {
      id: "demo-photographer",
      email: "photographer@demo.com",
      name: "Jake Waters",
      role: "PHOTOGRAPHER",
      passwordHash: hash,
    },
  });

  await prisma.user.upsert({
    where: { email: "surfer@demo.com" },
    update: { passwordHash: hash },
    create: {
      email: "surfer@demo.com",
      name: "Demo Surfer",
      role: "USER",
      passwordHash: hash,
    },
  });

  await prisma.session.upsert({
    where: { id: "demo-session-1" },
    update: {},
    create: {
      id: "demo-session-1",
      title: "Dawn Patrol at Pipeline",
      location: "Pipeline, North Shore, Oahu",
      date: new Date("2026-03-15"),
      startTime: "06:00",
      endTime: "09:00",
      description: "Clean 6-8ft barrels, offshore winds. Epic morning session.",
      photographerId: photographer.id,
      published: true,
    },
  });

  console.log("Seed complete ✓");
  console.log("  Photographer: photographer@demo.com / password");
  console.log("  Surfer:       surfer@demo.com / password");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
