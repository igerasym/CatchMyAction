import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { rateLimit } from "./rate-limit";
import { SIGNUP_ROLE_COOKIE, decideGoogleSignIn, googleConfigured, roleFromCookie } from "./google-auth";

/** Find the user behind a Google email (case-insensitive: older accounts keep whatever case they signed up with). */
function findByEmail(email: string) {
  return prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login", // OAuth failures come back as /login?error=<code>
  },
  providers: [
    // Only offered when the keys are configured on the server (see docs/GOOGLE_SIGNIN.md)
    ...(googleConfigured()
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) return null;

        // Brute-force / credential-stuffing throttle: per address and per client IP
        const headers = (req?.headers ?? {}) as Record<string, string | undefined>;
        const ip =
          headers["cf-connecting-ip"] || headers["x-real-ip"] || headers["x-forwarded-for"]?.split(",")[0].trim() || "unknown";
        const email = credentials.email.trim().toLowerCase();
        if (!rateLimit(`login:em:${email}`, 10, 15 * 60 * 1000) || !rateLimit(`login:ip:${ip}`, 30, 15 * 60 * 1000)) {
          throw new Error("Too many sign-in attempts. Wait a few minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      const p = (profile ?? {}) as { email?: string; email_verified?: boolean; name?: string; picture?: string };
      const email = p.email?.trim().toLowerCase();
      const existing = email ? await findByEmail(email) : null;
      const signupRole = roleFromCookie(cookies().get(SIGNUP_ROLE_COOKIE)?.value);
      const decision = decideGoogleSignIn(p, existing, signupRole);
      if (decision.action === "reject") {
        return decision.reason === "unverified-email" ? "/login?error=GoogleUnverified" : "/login?error=GoogleNoEmail";
      }
      if (decision.action === "create") {
        await prisma.user.create({ data: decision.data });
      } else if (existing && Object.keys(decision.patch).length > 0) {
        await prisma.user.update({ where: { id: existing.id }, data: decision.patch });
      }
      return true;
    },
    async jwt({ token, user, trigger, account, profile }) {
      // Google: the provider's own user object isn't ours; load the account that signIn created or matched
      if (account?.provider === "google") {
        const email = (profile as { email?: string } | undefined)?.email?.trim().toLowerCase();
        const dbUser = email ? await findByEmail(email) : null;
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl;
          token.emailVerified = dbUser.emailVerified;
        }
        return token;
      }
      // First sign in — set id from user
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl;
        token.emailVerified = (user as any).emailVerified || false;
      }
      // On update() call — refresh from DB
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.avatarUrl = dbUser.avatarUrl;
          token.emailVerified = (dbUser as any).emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).avatarUrl = token.avatarUrl;
        (session.user as any).emailVerified = token.emailVerified;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};
