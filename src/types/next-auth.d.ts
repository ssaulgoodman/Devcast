import { DefaultSession, User } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string;
    user: {
      /** The user's MongoDB ID. */
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  }

  /**
   * The shape of the account object returned in the OAuth providers' `account` callback.
   * Extended to include the access_token and oauth_token_secret properties.
   */
  interface Account {
    access_token?: string;
    oauth_token_secret?: string;
    provider: string;
    type: string;
    id: string;
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    accessToken?: string;
    accessTokenSecret?: string;
    provider?: string;
  }
} 