import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import passport from "passport";
import { env } from "./env.js";
import { errorHandler } from "./middlewares/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { membersRouter } from "./modules/members/members.routes.js";
import { roomsRouter } from "./modules/rooms/rooms.routes.js";
import { invitesRouter } from "./modules/invites/invites.routes.js";
import { drawsRouter } from "./modules/draws/draws.routes.js";
import { weightsRouter } from "./modules/weights/weights.routes.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(passport.initialize());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: env.NODE_ENV });
  });

  app.use(authRouter);
  app.use(usersRouter);
  app.use(roomsRouter);
  app.use("/rooms", membersRouter);
  app.use(invitesRouter);
  app.use(drawsRouter);
  app.use(weightsRouter);

  app.use(errorHandler);

  return app;
}
