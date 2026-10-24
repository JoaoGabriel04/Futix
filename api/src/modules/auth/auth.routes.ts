import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import DiscordStrategy from "passport-discord";
import { env } from "../../env.js";
import { requireAuth } from "../../middlewares/auth.js";
import { signAccess, signRefresh, verifyLink } from "../../lib/jwt.js";
import { upsertUser, EmailInUseOtherMethodError } from "./auth.service.js";
import { handleLogin, handleLogout, handleOAuthCallback, handleRefresh, handleRegister } from "./auth.controller.js";

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
        .catch((err: unknown) => {
          if (err instanceof EmailInUseOtherMethodError) {
            done(null, { errorCode: err.code } as unknown as Express.User);
            return;
          }
          done(err as Error);
        });
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
        .catch((err: unknown) => {
          if (err instanceof EmailInUseOtherMethodError) {
            done(null, { errorCode: err.code } as unknown as Express.User);
            return;
          }
          done(err as Error);
        });
    },
  ),
);

// ── Rate limiter ─────────────────────────────────────────────────────────────
// Only applied to OAuth initiation routes — prevents bot-triggered auth loops.
// /auth/refresh and /auth/logout are excluded: refresh is called automatically
// by the client on token expiry, so rate-limiting it would break normal usage.

const oauthInitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde e tente novamente." } },
});

// Rate limiter specific to POST /auth/login.
// Key is IP + normalised email to prevent credential stuffing.
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? "").toLowerCase().trim();
    const ip = req.ip ?? "unknown";
    return `${ip}:${email}`;
  },
  handler: (_req, res) => {
    res
      .status(429)
      .json({ error: "RATE_LIMIT_EXCEEDED", message: "Muitas tentativas. Tente novamente em 15 minutos" });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Router ───────────────────────────────────────────────────────────────────

const router: IRouter = Router();

// ── Email + password routes ──────────────────────────────────────────────────

router.post("/auth/register", (req, res, next) => {
  handleRegister(req, res).catch(next);
});

router.post("/auth/login", loginRateLimiter, (req, res, next) => {
  handleLogin(req, res).catch(next);
});

// ── OAuth routes ─────────────────────────────────────────────────────────────

router.get(
  "/auth/google",
  oauthInitLimiter,
  passport.authenticate("google", { session: false, scope: ["profile", "email"] }),
);

router.get(
  "/auth/google/callback",
  oauthInitLimiter,
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${env.WEB_URL}/entrar`,
  }),
  handleOAuthCallback,
);

router.get(
  "/auth/discord",
  oauthInitLimiter,
  passport.authenticate("discord", { session: false }),
);

router.get(
  "/auth/discord/callback",
  oauthInitLimiter,
  passport.authenticate("discord", {
    session: false,
    failureRedirect: `${env.WEB_URL}/entrar`,
  }),
  handleOAuthCallback,
);

router.get("/auth/exchange", (req, res) => {
  const t = req.query["t"];
  if (typeof t !== "string" || t.length === 0) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Token ausente." } });
    return;
  }
  try {
    const { userId, isNew } = verifyLink(t);
    const accessToken = signAccess(userId);
    const refreshToken = signRefresh(userId);
    res.json({ accessToken, refreshToken, isNew });
  } catch {
    res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Link inválido ou expirado." } });
  }
});

router.post("/auth/refresh", handleRefresh);
router.post("/auth/logout", requireAuth, handleLogout);

export { router as authRouter };
