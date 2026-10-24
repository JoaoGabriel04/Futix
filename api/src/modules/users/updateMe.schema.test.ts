import { describe, it, expect } from "vitest";
import { updateMeSchema } from "@fut/shared";

const VALID_BASE = { name: "João Silva" };

describe("updateMeSchema — R47: PATCH /me validation", () => {
  // ── name ────────────────────────────────────────────────────────────────────

  it("passes with a valid name", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE });
    expect(result.success).toBe(true);
  });

  it("fails when name is too short (1 char)", () => {
    const result = updateMeSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("fails when name is blank (whitespace only after trim)", () => {
    const result = updateMeSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("fails when name is too long (81 chars)", () => {
    const result = updateMeSchema.safeParse({ name: "A".repeat(81) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["name"]).toBeDefined();
    }
  });

  it("passes when name is exactly 80 chars", () => {
    const result = updateMeSchema.safeParse({ name: "A".repeat(80) });
    expect(result.success).toBe(true);
  });

  // ── nickname ─────────────────────────────────────────────────────────────────

  it("passes when nickname is absent (optional)", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE });
    expect(result.success).toBe(true);
  });

  it("passes when nickname is 30 chars", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, nickname: "N".repeat(30) });
    expect(result.success).toBe(true);
  });

  it("fails when nickname is 31 chars", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, nickname: "N".repeat(31) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["nickname"]).toBeDefined();
    }
  });

  // ── phone ────────────────────────────────────────────────────────────────────

  it("passes with a valid mobile phone (XX) XXXXX-XXXX", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, phone: "(11) 99999-9999" });
    expect(result.success).toBe(true);
  });

  it("passes with a valid landline phone (XX) XXXX-XXXX", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, phone: "(11) 9999-9999" });
    expect(result.success).toBe(true);
  });

  it("fails when phone has no formatting", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, phone: "11999999999" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["phone"]).toBeDefined();
    }
  });

  it("passes when phone is empty string (transformed to undefined)", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, phone: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  it("passes when phone is absent (optional)", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });

  // ── preferredPosition ────────────────────────────────────────────────────────

  it("passes with position Goleiro", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, preferredPosition: "Goleiro" });
    expect(result.success).toBe(true);
  });

  it("passes with position Atacante", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, preferredPosition: "Atacante" });
    expect(result.success).toBe(true);
  });

  it("passes with position Defensor", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, preferredPosition: "Defensor" });
    expect(result.success).toBe(true);
  });

  it("passes with position Meia", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, preferredPosition: "Meia" });
    expect(result.success).toBe(true);
  });

  it("fails with position Zagueiro (not in enum)", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE, preferredPosition: "Zagueiro" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["preferredPosition"]).toBeDefined();
    }
  });

  it("passes when preferredPosition is absent (optional)", () => {
    const result = updateMeSchema.safeParse({ ...VALID_BASE });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferredPosition).toBeUndefined();
    }
  });
});
