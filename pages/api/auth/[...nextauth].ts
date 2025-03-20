import NextAuth, { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import TwitterProvider from "next-auth/providers/twitter";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/utils/mongodb";
import connectDB from "@/utils/database";
import { User } from "@/models/User";

// Initialize database connection
connectDB();

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      authorization: {
        params: {
          // Request additional scopes
          scope: "read:user user:email repo",
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID as string,
      clientSecret: process.env.TWITTER_CLIENT_SECRET as string,
      version: "2.0",
    }),
  ],
  adapter: MongoDBAdapter(clientPromise),
  callbacks: {
    async jwt({ token, account }) {
      // Pass access token to the client side
      if (account) {
        token.accessToken = account.access_token || '';
        token.provider = account.provider;

        // If this is a Twitter account, save access token secret
        if (account.provider === "twitter" && account.oauth_token_secret) {
          token.accessTokenSecret = account.oauth_token_secret;
        }
      }
      return token;
    },
    async session({ session, token, user }) {
      // Add access token to session
      session.accessToken = token.accessToken;
      if (user) {
        session.user.id = user.id;
      }
      
      // Store provider-specific IDs and access tokens in our User model
      if (token.provider === "github" && user && token.sub) {
        try {
          const existingUser = await User.findById(user.id);
          
          if (existingUser) {
            // Update GitHub information
            await User.findByIdAndUpdate(user.id, {
              githubId: token.sub,
              githubUsername: user.name || '',
              "accessTokens.github": token.accessToken || '',
            });
          }
        } catch (error) {
          console.error("Error updating user with GitHub data:", error);
        }
      } else if (token.provider === "twitter" && user && token.sub) {
        try {
          const existingUser = await User.findById(user.id);
          
          if (existingUser) {
            // Update Twitter information
            await User.findByIdAndUpdate(user.id, {
              twitterId: token.sub,
              twitterUsername: user.name || '',
              "accessTokens.twitter": token.accessToken || '',
              "accessTokens.twitterSecret": token.accessTokenSecret || '',
            });
          }
        } catch (error) {
          console.error("Error updating user with Twitter data:", error);
        }
      }
      
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions); 