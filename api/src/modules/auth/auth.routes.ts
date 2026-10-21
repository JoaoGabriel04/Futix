import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import DiscordStrategy from "passport-discord";
import { env } from "../../env.js";
import { requireAuth } from "../../middlewares/auth.js";
import { upsertUser } from "./auth.service.js";
import { handleLogout, handleOAuthCallback, handleRefresh } from "./auth.controller.js";

// ── Passport strategies ──────────────────────────────────────────────────────

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${env.API_URL}/auth/google/callback`,
    },
    (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;
      const avatarUrl = profile.photos?.[0]?.value;
      upsertUser("GOOGLE", profile.id, {
        name: profile.displayName,
        ...(email !== undefined && { email }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      })
        .then((result) => done(null, result))
        .catch((err: unknown) => done(err as Error));
    },
  ),
);

passport.use(
  new DiscordStrategy(
    {
      clientID: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
      callbackURL: `${env.API_URL}/auth/discord/callback`,
      scope: ["identify", "email"],
    },
    (_accessToken, _refreshToken, profile, done) => {
      const avatar = profile.avatar;
      const avatarUrl =
        avatar !== null && avatar !== undefined && avatar.length > 0
          ? `https://cdn.discordapp.com/avatars/${profile.id}/${avatar}.png`
          : undefined;

      const email = profile.email ?? undefined;
      upsertUser("DISCORD", profile.id, {
        name: profile.username,
        ...(email !== undefined && { email }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      })
        .then((result) => done(null, result))
        .catch((err: unknown) => done(err as Error));
    },
  ),
);

// ── Rate limiter ─────────────────────────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Router ───────────────────────────────────────────────────────────────────

const router: IRouter = Router();

router.use(authLimiter);

router.get(
  "/auth/google",
  passport.authenticate("google", { session: false, scope: ["profile", "email"] }),
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.WEB_URL}/entrar`,
  }),
  handleOAuthCallback,
);

router.get(
  "/auth/discord",
  passport.authenticate("discord", { session: false }),
);

router.get(
  "/auth/discord/callback",
  passport.authenticate("discord", {
    session: false,
    failureRedirect: `${env.WEB_URL}/entrar`,
  }),
  handleOAuthCallback,
);

router.post("/auth/refresh", handleRefresh);
router.post("/auth/logout", requireAuth, handleLogout);

export { router as authRouter };
