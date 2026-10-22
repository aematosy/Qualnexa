import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";

// This should be passed from server.ts
export interface AuthState {
  authUsers: Map<string, { email: string; name?: string | undefined; verified?: boolean; passwordHash?: string; provider?: "LOCAL" | "GOOGLE" | "GITHUB" }>;
  authSessions: Map<string, string>;
  BCRYPT_ROUNDS: number;
}

export async function registerOAuthRoutes(app: FastifyInstance, authState: AuthState) {
  const { authUsers, authSessions, BCRYPT_ROUNDS } = authState;

  // OAuth callback for Google
  app.get(
    "/api/auth/oauth/google/callback",
    async (request, reply) => {
      const code = (request.query as { code?: string; state?: string }).code;
      const state = (request.query as { code?: string; state?: string }).state;

      if (!code) {
        return reply.code(400).send({ message: "Missing authorization code." });
      }

      try {
        const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
        const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
        const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${request.protocol}://${request.hostname}/api/auth/oauth/google/callback`;

        if (!googleClientId || !googleClientSecret) {
          app.log.error("Google OAuth not configured");
          return reply.code(500).send({ message: "OAuth provider not configured." });
        }

        // Exchange code for token
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: googleClientId,
            client_secret: googleClientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }).toString(),
        });

        if (!tokenResponse.ok) {
          app.log.error("Token exchange failed");
          return reply.code(401).send({ message: "Token exchange failed." });
        }

        const tokenData = (await tokenResponse.json()) as { access_token?: string };
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          return reply.code(401).send({ message: "No access token received." });
        }

        // Get user info
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userInfoResponse.ok) {
          return reply.code(401).send({ message: "Failed to fetch user info." });
        }

        const userInfo = (await userInfoResponse.json()) as { email?: string; name?: string };

        if (!userInfo.email) {
          return reply.code(400).send({ message: "Email not provided by OAuth provider." });
        }

        // Find or create user
        let userEntry = [...authUsers.entries()].find(([, user]) => user.email === userInfo.email);
        let userId: string;
        let isNewUser = false;

        if (!userEntry) {
          userId = randomUUID();
          authUsers.set(userId, {
            email: userInfo.email,
            name: userInfo.name || "Google User",
            verified: true,
            provider: "GOOGLE",
          });
          isNewUser = true;
        } else {
          userId = userEntry[0];
        }

        const sessionId = randomUUID();
        authSessions.set(sessionId, userId);
        reply.setCookie("sessionId", sessionId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

        // Redirect to frontend
        const redirectUrl = new URL(isNewUser ? "/login?newUser=true" : "/", process.env.FRONTEND_URL || "http://127.0.0.1:5173");
        return reply.redirect(redirectUrl.toString());
      } catch (error) {
        app.log.error(error, "OAuth callback error");
        return reply.code(500).send({ message: "Authentication failed." });
      }
    },
  );

  // OAuth callback for GitHub
  app.get(
    "/api/auth/oauth/github/callback",
    async (request, reply) => {
      const code = (request.query as { code?: string; state?: string }).code;

      if (!code) {
        return reply.code(400).send({ message: "Missing authorization code." });
      }

      try {
        const githubClientId = process.env.GITHUB_CLIENT_ID?.trim();
        const githubClientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

        if (!githubClientId || !githubClientSecret) {
          app.log.error("GitHub OAuth not configured");
          return reply.code(500).send({ message: "OAuth provider not configured." });
        }

        // Exchange code for token
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            code,
            client_id: githubClientId,
            client_secret: githubClientSecret,
          }).toString(),
        });

        if (!tokenResponse.ok) {
          app.log.error("Token exchange failed");
          return reply.code(401).send({ message: "Token exchange failed." });
        }

        const tokenData = (await tokenResponse.json()) as { access_token?: string };
        const accessToken = tokenData.access_token;

        if (!accessToken) {
          return reply.code(401).send({ message: "No access token received." });
        }

        // Get user info
        const userResponse = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
          return reply.code(401).send({ message: "Failed to fetch user info." });
        }

        const userInfo = (await userResponse.json()) as { login?: string; name?: string };

        if (!userInfo.login) {
          return reply.code(400).send({ message: "Username not provided by GitHub." });
        }

        // Get email if available (GitHub may not provide it by default)
        const emailResponse = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        let email = `${userInfo.login}@github.local`;
        if (emailResponse.ok) {
          const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean }>;
          const primaryEmail = emails.find((e) => e.primary);
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }

        // Find or create user
        let userEntry = [...authUsers.entries()].find(([, user]) => user.email === email);
        let userId: string;
        let isNewUser = false;

        if (!userEntry) {
          userId = randomUUID();
          authUsers.set(userId, {
            email,
            name: userInfo.name || userInfo.login || "GitHub User",
            verified: true,
            provider: "GITHUB",
          });
          isNewUser = true;
        } else {
          userId = userEntry[0];
        }

        const sessionId = randomUUID();
        authSessions.set(sessionId, userId);
        reply.setCookie("sessionId", sessionId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

        // Redirect to frontend
        const redirectUrl = new URL(isNewUser ? "/login?newUser=true" : "/", process.env.FRONTEND_URL || "http://127.0.0.1:5173");
        return reply.redirect(redirectUrl.toString());
      } catch (error) {
        app.log.error(error, "OAuth callback error");
        return reply.code(500).send({ message: "Authentication failed." });
      }
    },
  );
}
