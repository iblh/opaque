import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import bcrypt from 'bcrypt';
import { db } from '@/db/client';
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from '@/db/schema';
import { ensureDashboardForUser, findUserByLogin, userDisplayName } from '@/lib/repositories/user';

const providers = [
  Credentials({
    name: 'Credentials',
    credentials: {
      identifier: { label: 'Email or username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      const identifier = String(credentials?.identifier || '');
      const password = String(credentials?.password || '');

      if (!identifier || !password) return null;

      const user = await findUserByLogin(identifier);
      if (!user?.passwordHash) return null;

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) return null;

      return {
        id: user.id,
        name: userDisplayName(user),
        email: user.email,
        image: user.image,
        username: user.username,
      };
    },
  }),
];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }) as any,
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  providers,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username || null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || '');
        session.user.username =
          typeof token.username === 'string' ? token.username : null;
      }

      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await ensureDashboardForUser(user.id);
      }
    },
  },
  trustHost: true,
});
