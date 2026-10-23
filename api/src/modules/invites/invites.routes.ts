import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  handleCreateInvite,
  handleGetInvitePreview,
  handleUseInvite,
} from "./invites.controller.js";

const createInviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde e tente novamente." } },
});

const useInviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde e tente novamente." } },
});

const router: IRouter = Router();

router.post("/rooms/:id/invites", createInviteLimiter, requireAuth, requireOrganizerRole, handleCreateInvite);
router.get("/invites/:token", requireAuth, handleGetInvitePreview);
router.post("/invites/:token/use", useInviteLimiter, requireAuth, handleUseInvite);

export { router as invitesRouter };
