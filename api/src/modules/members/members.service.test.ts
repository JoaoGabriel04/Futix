import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RoomMember } from "@prisma/client";

// ── mock prisma ────────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports, ensuring the mock objects exist
// by the time vi.mock's factory is executed. This is required for ESM.

const { prismaMock } = vi.hoisted(() => {
  const prismaMock = {
    room: {
      findUnique: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return { prismaMock };
});

vi.mock("../../lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// Import service AFTER vi.mock declaration so the module receives the mocked prisma.
import {
  joinRoom,
  leaveRoom,
  approveMember,
  rejectMember,
  promoteMember,
  addCoOrganizer,
  removeCoOrganizer,
} from "./members.service.js";

// ── shared fixtures ────────────────────────────────────────────────────────────

const FAKE_OPEN_ROOM = {
  id: "room-1",
  status: "OPEN",
  lineSlots: 10,
  goalkeeperSlots: 2,
} as unknown as { id: string; status: string; lineSlots: number; goalkeeperSlots: number };

const fakeMember = (overrides: Partial<RoomMember & { room: unknown }> = {}): RoomMember & { room: unknown } =>
  ({
    id: "member-1",
    roomId: "room-1",
    userId: "user-1",
    role: "PLAYER",
    status: "PENDING",
    playRole: "LINE",
    waitlistPosition: null,
    requestedAt: new Date(),
    decidedAt: null,
    decidedById: null,
    invitedById: null,
    room: { status: "OPEN", lineSlots: 10, goalkeeperSlots: 2 },
    ...overrides,
  }) as unknown as RoomMember & { room: unknown };

// ══════════════════════════════════════════════════════════════════════════════
// Regra 3 — joinRoom
// ══════════════════════════════════════════════════════════════════════════════

describe("joinRoom — Regra 3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: sala não OPEN → ROOM_NOT_OPEN
  it("throws ROOM_NOT_OPEN (400) when the room status is not OPEN", async () => {
    prismaMock.room.findUnique.mockResolvedValue({ id: "room-1", status: "LOCKED" });

    await expect(joinRoom("user-1", "room-1", { playRole: "LINE" })).rejects.toMatchObject({
      code: "ROOM_NOT_OPEN",
      status: 400,
    });

    expect(prismaMock.roomMember.create).not.toHaveBeenCalled();
  });

  // Test 2: usuário já membro → ALREADY_MEMBER
  it("throws ALREADY_MEMBER (409) when the user is already a member", async () => {
    prismaMock.room.findUnique.mockResolvedValue(FAKE_OPEN_ROOM);
    prismaMock.roomMember.findFirst.mockResolvedValue(fakeMember());

    await expect(joinRoom("user-1", "room-1", { playRole: "LINE" })).rejects.toMatchObject({
      code: "ALREADY_MEMBER",
      status: 409,
    });

    expect(prismaMock.roomMember.create).not.toHaveBeenCalled();
  });

  // Test 3: válido → cria membro PENDING
  it("creates a PENDING PLAYER member with the given playRole", async () => {
    const created = fakeMember({ status: "PENDING", role: "PLAYER", playRole: "LINE" });
    prismaMock.room.findUnique.mockResolvedValue(FAKE_OPEN_ROOM);
    prismaMock.roomMember.findFirst.mockResolvedValue(null);
    prismaMock.roomMember.create.mockResolvedValue(created);

    const result = await joinRoom("user-1", "room-1", { playRole: "LINE" });

    expect(prismaMock.roomMember.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.roomMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: "room-1",
          userId: "user-1",
          role: "PLAYER",
          status: "PENDING",
          playRole: "LINE",
        }),
      }),
    );
    expect(result).toEqual(created);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 9 — leaveRoom
// ══════════════════════════════════════════════════════════════════════════════

describe("leaveRoom — Regra 9", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 4: organizador não pode sair → ORGANIZER_CANNOT_LEAVE
  it("throws ORGANIZER_CANNOT_LEAVE (403) when the user is an ORGANIZER", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(
      fakeMember({ role: "ORGANIZER", status: "CONFIRMED" }),
    );

    await expect(leaveRoom("user-1", "room-1")).rejects.toMatchObject({
      code: "ORGANIZER_CANNOT_LEAVE",
      status: 403,
    });

    expect(prismaMock.roomMember.delete).not.toHaveBeenCalled();
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 5: PENDING → deleta
  it("deletes the RoomMember when status is PENDING", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(
      fakeMember({ status: "PENDING", role: "PLAYER", room: { status: "OPEN" } }),
    );
    prismaMock.roomMember.delete.mockResolvedValue(undefined);

    await leaveRoom("user-1", "room-1");

    expect(prismaMock.roomMember.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "member-1" } }),
    );
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 6: CONFIRMED → atualiza para LEFT
  it("updates status to LEFT when member is CONFIRMED", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(
      fakeMember({ status: "CONFIRMED", role: "PLAYER", room: { status: "OPEN" } }),
    );
    prismaMock.roomMember.update.mockResolvedValue(fakeMember({ status: "LEFT" }));

    await leaveRoom("user-1", "room-1");

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-1" },
        data: expect.objectContaining({ status: "LEFT" }),
      }),
    );
    expect(prismaMock.roomMember.delete).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 4 — approveMember
// ══════════════════════════════════════════════════════════════════════════════

describe("approveMember — Regra 4", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 7: membro não PENDING → INVALID_STATUS
  it("throws INVALID_STATUS (400) when member is not PENDING", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<RoomMember>) => {
      const txMock = {
        ...prismaMock,
        $queryRaw: vi.fn().mockResolvedValue([
          fakeMember({ status: "CONFIRMED", roomId: "room-1" }),
        ]),
        room: { findUnique: vi.fn().mockResolvedValue(FAKE_OPEN_ROOM) },
        roomMember: { ...prismaMock.roomMember },
      };
      return fn(txMock as unknown as typeof prismaMock);
    });

    await expect(approveMember("approver-1", "room-1", "member-1")).rejects.toMatchObject({
      code: "INVALID_STATUS",
      status: 400,
    });
  });

  // Test 8: há vaga → CONFIRMED
  it("sets status to CONFIRMED when there is a vacancy", async () => {
    const confirmedMember = fakeMember({ status: "CONFIRMED", playRole: "LINE" });

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<RoomMember>) => {
      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([
          fakeMember({ status: "PENDING", playRole: "LINE", roomId: "room-1" }),
        ]),
        room: {
          findUnique: vi.fn().mockResolvedValue({ lineSlots: 10, goalkeeperSlots: 2 }),
        },
        roomMember: {
          count: vi.fn().mockResolvedValue(5), // 5 < 10 slots → há vaga
          aggregate: vi.fn(),
          update: vi.fn().mockResolvedValue(confirmedMember),
        },
      };
      return fn(txMock as unknown as typeof prismaMock);
    });

    const result = await approveMember("approver-1", "room-1", "member-1");

    expect(result.status).toBe("CONFIRMED");
  });

  // Test 9: sem vaga → WAITLIST
  it("sets status to WAITLIST when there is no vacancy", async () => {
    const waitlistMember = fakeMember({ status: "WAITLIST", waitlistPosition: 1 });

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<RoomMember>) => {
      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([
          fakeMember({ status: "PENDING", playRole: "LINE", roomId: "room-1" }),
        ]),
        room: {
          findUnique: vi.fn().mockResolvedValue({ lineSlots: 10, goalkeeperSlots: 2 }),
        },
        roomMember: {
          count: vi.fn().mockResolvedValue(10), // 10 === 10 slots → sem vaga
          aggregate: vi.fn().mockResolvedValue({ _max: { waitlistPosition: 0 } }),
          update: vi.fn().mockResolvedValue(waitlistMember),
        },
      };
      return fn(txMock as unknown as typeof prismaMock);
    });

    const result = await approveMember("approver-1", "room-1", "member-1");

    expect(result.status).toBe("WAITLIST");
  });

  // Test 10: CORRIDA — dois aprovadores, 1 vaga → segundo fica WAITLIST
  it("places second approver's member on WAITLIST when race condition occurs (1 vacancy)", async () => {
    let callCount = 0;

    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => Promise<RoomMember>) => {
      callCount += 1;
      const isFirst = callCount === 1;

      const txMock = {
        $queryRaw: vi.fn().mockResolvedValue([
          fakeMember({ status: "PENDING", playRole: "LINE", roomId: "room-1" }),
        ]),
        room: {
          findUnique: vi.fn().mockResolvedValue({ lineSlots: 10, goalkeeperSlots: 2 }),
        },
        roomMember: {
          // First call: 9 confirmed (1 vacancy). Second call (inside lock): 10 confirmed (no vacancy)
          count: vi.fn().mockResolvedValue(isFirst ? 9 : 10),
          aggregate: vi.fn().mockResolvedValue({ _max: { waitlistPosition: 0 } }),
          update: vi.fn().mockImplementation(
            ({ data }: { data: { status: string; waitlistPosition?: number } }) =>
              Promise.resolve(
                fakeMember({
                  status: data.status as "CONFIRMED" | "WAITLIST",
                  waitlistPosition: data.waitlistPosition ?? null,
                }),
              ),
          ),
        },
      };
      return fn(txMock as unknown as typeof prismaMock);
    });

    const first = await approveMember("approver-1", "room-1", "member-1");
    const second = await approveMember("approver-2", "room-1", "member-2");

    expect(first.status).toBe("CONFIRMED");
    expect(second.status).toBe("WAITLIST");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 5 — rejectMember
// ══════════════════════════════════════════════════════════════════════════════

describe("rejectMember — Regra 5", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 11: válido → REJECTED com decidedById
  it("sets status to REJECTED with decidedById when member is PENDING", async () => {
    const rejected = fakeMember({ status: "REJECTED", decidedById: "approver-1" });

    prismaMock.roomMember.findFirst.mockResolvedValue(fakeMember({ status: "PENDING" }));
    prismaMock.roomMember.update.mockResolvedValue(rejected);

    const result = await rejectMember("approver-1", "room-1", "member-1");

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-1" },
        data: expect.objectContaining({
          status: "REJECTED",
          decidedById: "approver-1",
        }),
      }),
    );
    expect(result.status).toBe("REJECTED");
    expect(result.decidedById).toBe("approver-1");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 8 — promoteMember
// ══════════════════════════════════════════════════════════════════════════════

describe("promoteMember — Regra 8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 12: sem vaga → NO_VACANCY
  it("throws NO_VACANCY (409) when there is no vacancy for the playRole", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(
      fakeMember({
        status: "WAITLIST",
        playRole: "LINE",
        room: { lineSlots: 10, goalkeeperSlots: 2 },
      }),
    );
    prismaMock.roomMember.count.mockResolvedValue(10); // 10 === 10 slots → sem vaga

    await expect(promoteMember("approver-1", "room-1", "member-1")).rejects.toMatchObject({
      code: "NO_VACANCY",
      status: 409,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 13: com vaga → CONFIRMED
  it("sets status to CONFIRMED and clears waitlistPosition when vacancy exists", async () => {
    const promoted = fakeMember({ status: "CONFIRMED", waitlistPosition: null });

    prismaMock.roomMember.findFirst.mockResolvedValue(
      fakeMember({
        status: "WAITLIST",
        playRole: "LINE",
        room: { lineSlots: 10, goalkeeperSlots: 2 },
      }),
    );
    prismaMock.roomMember.count.mockResolvedValue(7); // 7 < 10 → há vaga
    prismaMock.roomMember.update.mockResolvedValue(promoted);

    const result = await promoteMember("approver-1", "room-1", "member-1");

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-1" },
        data: expect.objectContaining({
          status: "CONFIRMED",
          waitlistPosition: null,
        }),
      }),
    );
    expect(result.status).toBe("CONFIRMED");
    expect(result.waitlistPosition).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 10 — addCoOrganizer
// ══════════════════════════════════════════════════════════════════════════════

describe("addCoOrganizer — Regra 10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const organizerMember = fakeMember({ userId: "organizer-1", role: "ORGANIZER", status: "CONFIRMED" });
  const coOrgMember = fakeMember({ id: "member-2", userId: "co-org-1", role: "CO_ORGANIZER", status: "CONFIRMED" });
  const confirmedPlayer = fakeMember({ id: "member-3", userId: "player-1", role: "PLAYER", status: "CONFIRMED" });

  // Test 14: CO_ORGANIZER tenta nomear → NOT_ORGANIZER (403)
  it("throws NOT_ORGANIZER (403) when requester is a CO_ORGANIZER", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValueOnce(
      fakeMember({ userId: "co-org-1", role: "CO_ORGANIZER", status: "CONFIRMED" }),
    );

    await expect(addCoOrganizer("co-org-1", "room-1", "player-1")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 15: Alvo não é membro → NOT_MEMBER (404)
  it("throws NOT_MEMBER (404) when the target user is not a member of the room", async () => {
    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)   // requester lookup
      .mockResolvedValueOnce(null);             // target lookup

    await expect(addCoOrganizer("organizer-1", "room-1", "nonexistent-user")).rejects.toMatchObject({
      code: "NOT_MEMBER",
      status: 404,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 16: Alvo não é CONFIRMED → NOT_CONFIRMED (400)
  it("throws NOT_CONFIRMED (400) when the target member is not CONFIRMED", async () => {
    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)
      .mockResolvedValueOnce(fakeMember({ id: "member-3", userId: "player-1", role: "PLAYER", status: "PENDING" }));

    await expect(addCoOrganizer("organizer-1", "room-1", "player-1")).rejects.toMatchObject({
      code: "NOT_CONFIRMED",
      status: 400,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 17: Já existem 2 co-organizadores → CO_ORGANIZER_LIMIT (409)
  it("throws CO_ORGANIZER_LIMIT (409) when the room already has 2 co-organizers", async () => {
    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)
      .mockResolvedValueOnce(confirmedPlayer);
    prismaMock.roomMember.count.mockResolvedValue(2); // já tem 2 co-organizadores

    await expect(addCoOrganizer("organizer-1", "room-1", "player-1")).rejects.toMatchObject({
      code: "CO_ORGANIZER_LIMIT",
      status: 409,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 18: Caso válido → atualiza role para CO_ORGANIZER
  it("updates role to CO_ORGANIZER when all conditions are met", async () => {
    const updated = fakeMember({ id: "member-3", userId: "player-1", role: "CO_ORGANIZER", status: "CONFIRMED" });

    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)
      .mockResolvedValueOnce(confirmedPlayer);
    prismaMock.roomMember.count.mockResolvedValue(1); // apenas 1 co-organizador existente
    prismaMock.roomMember.update.mockResolvedValue(updated);

    const result = await addCoOrganizer("organizer-1", "room-1", "player-1");

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-3" },
        data: { role: "CO_ORGANIZER" },
      }),
    );
    expect(result.role).toBe("CO_ORGANIZER");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Regra 10 — removeCoOrganizer
// ══════════════════════════════════════════════════════════════════════════════

describe("removeCoOrganizer — Regra 10", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const organizerMember = fakeMember({ userId: "organizer-1", role: "ORGANIZER", status: "CONFIRMED" });
  const coOrgMember = fakeMember({ id: "member-2", userId: "co-org-1", role: "CO_ORGANIZER", status: "CONFIRMED" });

  // Test 19: CO_ORGANIZER tenta remover → NOT_ORGANIZER (403)
  it("throws NOT_ORGANIZER (403) when requester is a CO_ORGANIZER", async () => {
    prismaMock.roomMember.findFirst.mockResolvedValueOnce(
      fakeMember({ userId: "co-org-1", role: "CO_ORGANIZER", status: "CONFIRMED" }),
    );

    await expect(removeCoOrganizer("co-org-1", "room-1", "co-org-2")).rejects.toMatchObject({
      code: "NOT_ORGANIZER",
      status: 403,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 20: Alvo não é CO_ORGANIZER → INVALID_STATUS (400)
  it("throws INVALID_STATUS (400) when the target member is not a CO_ORGANIZER", async () => {
    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)
      .mockResolvedValueOnce(fakeMember({ id: "member-3", userId: "player-1", role: "PLAYER", status: "CONFIRMED" }));

    await expect(removeCoOrganizer("organizer-1", "room-1", "player-1")).rejects.toMatchObject({
      code: "INVALID_STATUS",
      status: 400,
    });

    expect(prismaMock.roomMember.update).not.toHaveBeenCalled();
  });

  // Test 21: Caso válido → atualiza role para PLAYER
  it("updates role to PLAYER when target is a CO_ORGANIZER", async () => {
    const updated = fakeMember({ id: "member-2", userId: "co-org-1", role: "PLAYER", status: "CONFIRMED" });

    prismaMock.roomMember.findFirst
      .mockResolvedValueOnce(organizerMember)
      .mockResolvedValueOnce(coOrgMember);
    prismaMock.roomMember.update.mockResolvedValue(updated);

    const result = await removeCoOrganizer("organizer-1", "room-1", "co-org-1");

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "member-2" },
        data: { role: "PLAYER" },
      }),
    );
    expect(result.role).toBe("PLAYER");
  });
});
