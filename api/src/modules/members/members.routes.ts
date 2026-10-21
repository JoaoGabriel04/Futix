import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  handleJoin,
  handleLeave,
  handleApprove,
  handleReject,
  handlePromote,
  handleRemove,
} from "./members.controller.js";

const router: IRouter = Router();

router.post("/:id/join", requireAuth, handleJoin);
router.delete("/:id/join", requireAuth, handleLeave);

router.post("/:id/members/:memberId/approve", requireAuth, requireOrganizerRole, handleApprove);
router.post("/:id/members/:memberId/reject", requireAuth, requireOrganizerRole, handleReject);
router.post("/:id/members/:memberId/promote", requireAuth, requireOrganizerRole, handlePromote);
router.post("/:id/members/:memberId/remove", requireAuth, requireOrganizerRole, handleRemove);

export { router as membersRouter };
