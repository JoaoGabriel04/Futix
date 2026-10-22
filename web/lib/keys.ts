export const keys = {
  me: "/me",
  rooms: "/rooms",
  room: (id: string) => `/rooms/${id}`,
  draw: (id: string) => `/rooms/${id}/draw`,
  weights: (id: string) => `/rooms/${id}/weights`,
} as const;
