import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  LOGIN_MAX_ATTEMPTS,
  isLoginRateLimited,
  getLoginWindowCutoff,
  isLoginWindowExpired,
} from "@/lib/login-rate-limit";
import {
  isAdminPasswordHashValid,
  MINIMUM_ADMIN_PASSWORD_LENGTH,
  verifyAdminPassword,
} from "@/lib/admin-password";
import { authorizeCustomer } from "@/lib/customer-auth";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(MINIMUM_ADMIN_PASSWORD_LENGTH).max(1024),
});

export function isAdminConfigured(): boolean {
  const email = process.env.ADMIN_EMAIL?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.NEXTAUTH_SECRET;

  return Boolean(
    email &&
      z.string().email().safeParse(email).success &&
      passwordHash &&
      isAdminPasswordHashValid(passwordHash) &&
      secret &&
      secret.length >= 32
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  jwt: {
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    CredentialsProvider({
      name: "Store owner",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!isAdminConfigured()) return null;

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const configuredEmail = process.env.ADMIN_EMAIL?.trim();
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;
        if (
          !configuredEmail ||
          !passwordHash ||
          parsed.data.email.toLowerCase() !== configuredEmail.toLowerCase()
        ) {
          return null;
        }

        const now = new Date();
        const windowCutoff = getLoginWindowCutoff(now);
        let existingAttempt = await db.adminLoginAttempt.findUnique({
          where: { id: "owner" },
        });
        if (
          existingAttempt &&
          isLoginWindowExpired(existingAttempt.windowStartedAt, now)
        ) {
          const reset = await db.adminLoginAttempt.updateMany({
            where: {
              id: "owner",
              windowStartedAt: { lte: windowCutoff },
            },
            data: {
              attempts: 0,
              windowStartedAt: now,
            },
          });
          existingAttempt =
            reset.count > 0
              ? { ...existingAttempt, attempts: 0, windowStartedAt: now }
              : await db.adminLoginAttempt.findUnique({ where: { id: "owner" } });
        }

        if (
          existingAttempt &&
          isLoginRateLimited(existingAttempt.attempts)
        ) {
          return null;
        }

        const attempt = await db.adminLoginAttempt.upsert({
          where: { id: "owner" },
          create: {
            id: "owner",
            attempts: 1,
            windowStartedAt: now,
          },
          update: { attempts: { increment: 1 } },
        });
        if (
          isLoginRateLimited(attempt.attempts) &&
          attempt.attempts > LOGIN_MAX_ATTEMPTS
        ) {
          return null;
        }

        if (!verifyAdminPassword(parsed.data.password, passwordHash)) return null;

        await db.adminLoginAttempt.deleteMany({ where: { id: "owner" } });

        return {
          id: configuredEmail.toLowerCase(),
          email: configuredEmail,
          name: "Meridian Store Admin",
          role: "admin",
        };
      },
    }),
    CredentialsProvider({
      id: "customer",
      name: "Customer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCustomer,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = user.role;
      else if (
        !token.role &&
        token.email?.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase()
      ) {
        token.role = "admin";
      }
      return token;
    },
    async session({ session, token }) {
      if (
        session.user &&
        typeof token.sub === "string" &&
        (token.role === "admin" || token.role === "customer")
      ) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
};

export async function getAdminSession() {
  if (!isAdminConfigured()) return null;
  const session = await getServerSession(authOptions);
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return session?.user?.role === "admin" &&
    session.user.email?.toLowerCase() === configuredEmail
    ? session
    : null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return Boolean(await getAdminSession());
}

export function isCustomerAccountsConfigured(): boolean {
  return Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32);
}

export async function getCustomerSession() {
  if (!isCustomerAccountsConfigured()) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.role === "customer" && session.user.id ? session : null;
}
