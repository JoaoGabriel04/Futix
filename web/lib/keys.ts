export const keys = {
  me: "/me",
  rooms: "/rooms",
  room: (id: string) => `/rooms/${id}`,
} as const;
