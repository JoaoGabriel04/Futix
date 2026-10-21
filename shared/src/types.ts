import type { MEMBER_ROLE, MEMBER_STATUS, PLAY_ROLE, PROVIDER, ROOM_STATUS } from "./constants.js";

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];
export type MemberRole = (typeof MEMBER_ROLE)[keyof typeof MEMBER_ROLE];
export type PlayRole = (typeof PLAY_ROLE)[keyof typeof PLAY_ROLE];
export type MemberStatus = (typeof MEMBER_STATUS)[keyof typeof MEMBER_STATUS];
export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | "ROOM_LOCKED"
  | "ROLE_FULL"
  | "INVITE_EXPIRED"
  | "INVITE_USED"
  | "NOT_ORGANIZER"
  | "NOT_MEMBER"
  | "ALREADY_MEMBER"
  | "ROOM_NOT_FOUND"
  | "USER_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CANNOT_REDUCE_SLOTS"
  | "MAX_CO_ORGANIZERS"
  | "CANNOT_LEAVE_AS_ORGANIZER"
  | "DRAW_REQUIRES_LOCKED"
  | "NOT_ENOUGH_PLAYERS";
