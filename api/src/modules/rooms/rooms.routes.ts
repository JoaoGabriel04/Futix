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
} from "./rooms.controller.js";

const router: IRouter = Router();

router.post("/rooms", requireAuth, requireSameOrigin, createRoomHandler);
router.get("/rooms", requireAuth, listRoomsHandler);
router.get("/rooms/:id", requireAuth, getRoomHandler);
router.patch("/rooms/:id", requireAuth, requireSameOrigin, requireOrganizerRole, updateRoomHandler);
router.post("/rooms/:id/lock", requireAuth, requireOrganizerRole, lockRoomHandler);
router.post("/rooms/:id/unlock", requireAuth, requireOrganizerRole, unlockRoomHandler);
router.post("/rooms/:id/cancel", requireAuth, cancelRoomHandler);

export { router as roomsRouter };
