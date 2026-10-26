import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { requireSameOrigin } from "../../middlewares/sameOrigin.js";
import { requireOrganizerRole } from "../../middlewares/roomRole.js";
import {
  createRoomHandler,
  listRoomsHandler,
  getRoomHandler,
  updateRoomHandler,
  lockRoomHandler,
  unlockRoomHandler,
  cancelRoomHandler,
  finishRoomHandler,
  deleteRoomHandler,
  getRoomSessionHandler,
  getRoomSummaryHandler,
} from "./rooms.controller.js";

const router: IRouter = Router();

router.post("/rooms", requireAuth, requireSameOrigin, createRoomHandler);
router.get("/rooms", requireAuth, listRoomsHandler);
router.get("/rooms/:id", requireAuth, getRoomHandler);
router.patch("/rooms/:id", requireAuth, requireSameOrigin, requireOrganizerRole, updateRoomHandler);
router.post("/rooms/:id/lock", requireAuth, requireOrganizerRole, lockRoomHandler);
router.post("/rooms/:id/unlock", requireAuth, requireOrganizerRole, unlockRoomHandler);
router.post("/rooms/:id/cancel", requireAuth, cancelRoomHandler);
router.post("/rooms/:id/finish", requireAuth, requireOrganizerRole, finishRoomHandler);
router.delete("/rooms/:id", requireAuth, deleteRoomHandler);
router.get("/rooms/:id/session", requireAuth, getRoomSessionHandler);
router.get("/rooms/:id/summary", requireAuth, getRoomSummaryHandler);

export { router as roomsRouter };
