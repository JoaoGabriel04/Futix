export const ROOM_STATUS = {
  OPEN: "OPEN",
  LOCKED: "LOCKED",
  DRAWN: "DRAWN",
  CANCELED: "CANCELED",
  FINISHED: "FINISHED",
} as const;

export const MEMBER_ROLE = {
  PLAYER: "PLAYER",
  CO_ORGANIZER: "CO_ORGANIZER",
  ORGANIZER: "ORGANIZER",
} as const;

export const PLAY_ROLE = {
  LINE: "LINE",
  GOALKEEPER: "GOALKEEPER",
} as const;

export const MEMBER_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  WAITLIST: "WAITLIST",
  REJECTED: "REJECTED",
  LEFT: "LEFT",
} as const;

export const PROVIDER = {
  GOOGLE: "GOOGLE",
  DISCORD: "DISCORD",
} as const;

export const LIMITS = {
  MAX_CO_ORGANIZERS: 2,
  MIN_LINE_SLOTS: 2,
  MIN_TEAM_SIZE: 1,
  MIN_GOALKEEPER_SLOTS: 0,
  INVITE_TTL_HOURS: 24,
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,
  AVATAR_ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"],
  INVITE_TOKEN_BYTES: 32,
} as const;
