import passport from "passport";
import { Strategy as GoogleStrategy, type Profile } from "passport-google-oauth20";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

export function getSession() {
  const sessionTtl = 90 * 24 * 60 * 60 * 1000; // 3 months
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || "/api/callback";

  if (clientID && clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID,
          clientSecret,
          callbackURL,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: (err: any, user?: any) => void,
        ) => {
          try {
            const email = profile.emails?.[0]?.value?.toLowerCase();
            if (!email) {
              return done(new Error("Google profile missing email"));
            }
            const user = await authStorage.upsertUserByGoogleProfile({
              email,
              firstName: profile.name?.givenName,
              lastName: profile.name?.familyName,
              profileImageUrl: profile.photos?.[0]?.value,
            });
            return done(null, { id: user.id, email: user.email });
          } catch (err) {
            return done(err as Error);
          }
        },
      ),
    );
  } else {
    console.warn(
      "[auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not set — Google login disabled",
    );
  }

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  app.get(
    "/api/login",
    passport.authenticate("google", { scope: ["profile", "email"] }),
  );

  app.get(
    "/api/callback",
    passport.authenticate("google", {
      failureRedirect: "/api/login",
      session: true,
    }),
    (req: any, res) => {
      // Mirror onto the unified session.userId path used by phone/email auth
      if (req.user?.id) {
        req.session.userId = req.user.id;
        req.session.authMethod = "google";
      }
      res.redirect("/");
    },
  );

  app.get("/api/logout", (req: any, res) => {
    const finish = () => {
      req.session?.destroy?.(() => {
        res.redirect("/");
      }) ?? res.redirect("/");
    };
    if (typeof req.logout === "function") {
      req.logout(() => finish());
    } else {
      finish();
    }
  });

  // Simple email login (no verification required)
  app.post("/api/auth/email-login", async (req: any, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string") {
        return res.status(400).json({ message: "Email is required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const user = await authStorage.createOrUpdateUserByEmail(email);

      req.session.userId = user.id;
      req.session.authMethod = "email";

      res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
      console.error("Email login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (
    req.session?.userId &&
    ["google", "email", "phone"].includes(req.session?.authMethod)
  ) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
