import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { CredentialsSignin } from "next-auth";
import bcrypt from "bcryptjs";

import { sql } from "./lib/db";
import { requireEnv } from "./lib/env";

class AuthServiceUnavailableError extends CredentialsSignin {
  code = "service_unavailable";
}

export const { handlers, auth } = NextAuth({
  debug: process.env.NODE_ENV !== "production",
  pages: { signIn: "/login" },
  secret: requireEnv("NEXTAUTH_SECRET"),
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim();
        const password = credentials?.password?.toString() ?? "";

        if (!email || !password) {
          return null;
        }

        let users;

        try {
          users = await sql`
            SELECT id, email, password, name
            FROM users
            WHERE email = ${email.toLowerCase()}
          `;
        } catch (error) {
          console.error("Credentials authorize failed to reach the database.", error);
          throw new AuthServiceUnavailableError();
        }

        const user = users[0] as
          | {
              id: string | number;
              email: string;
              password: string;
              name: string | null;
            }
          | undefined;

        if (!user) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.password);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
});
