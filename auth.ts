import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

const nextAuth = NextAuth as unknown as (config: any) => {
  handlers: any;
  auth: any;
  signIn: any;
  signOut: any;
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = nextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    async signIn({ user }: { user: any }) {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      const email = user.email?.toLowerCase();
      if (email && adminEmails.includes(email)) {
        try {
          await db.update(users).set({ admin: true }).where(eq(users.email, email));
        } catch {
          // best-effort; ignore errors to not block sign-in
        }
      }
      return true;
    },
    async session({ session, user }: { session: any; user: any }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.admin = Boolean((user as any).admin);
      }
      return session;
    },
  },
  trustHost: true,
});
