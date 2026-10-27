import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  handleJoin,
  handleLeave,
  handleApprove,
  handleReject,
  handlePromote,
  handleRemove,
  handleMarkAbsent,
  handleAddCoOrganizer,
  handleRemoveCoOrganizer,
} from "./members.controller.js";

const joinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Muitas tentativas. Aguarde e tente novamente." } },
});

const router: IRouter = Router();

router.post("/:id/join", joinLimiter, requireAuth, handleJoin);
router.delete("/:id/join", requireAuth, handleLeave);

router.post("/:id/members/:memberId/approve", requireAuth, requireOrganizerRole, handleApprove);
router.post("/:id/members/:memberId/reject", requireAuth, requireOrganizerRole, handleReject);
router.post("/:id/members/:memberId/promote", requireAuth, requireOrganizerRole, handlePromote);
router.post("/:id/members/:memberId/remove", requireAuth, requireOrganizerRole, handleRemove);
router.post("/:id/members/:memberId/mark-absent", requireAuth, requireOrganizerRole, handleMarkAbsent);

router.put("/:id/co-organizers/:userId", requireAuth, handleAddCoOrganizer);
router.delete("/:id/co-organizers/:userId", requireAuth, handleRemoveCoOrganizer);

export { router as membersRouter };
