import type { DefaultSession } from "next-auth";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "admin" | "customer";
    } & DefaultSession["user"];
  }

  interface User {
    role: "admin" | "customer";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "customer";
  }
}
