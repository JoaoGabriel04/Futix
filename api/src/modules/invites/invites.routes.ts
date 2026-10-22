import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  handleCreateInvite,
  handleGetInvitePreview,
  handleUseInvite,
} from "./invites.controller.js";

const router: IRouter = Router();

router.post("/rooms/:id/invites", requireAuth, requireOrganizerRole, handleCreateInvite);
router.get("/invites/:token", requireAuth, handleGetInvitePreview);
router.post("/invites/:token/use", requireAuth, handleUseInvite);

export { router as invitesRouter };
