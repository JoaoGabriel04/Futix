"use client";
import { useEffect, useRef, useState } from "react";

interface TimerInput {
  status: "LIVE" | "PAUSED" | "FINISHED" | null;
  startedAt: string | null; // ISO string
  elapsedSeconds: number;
  limitSeconds: number;
  offset: number; // serverNow - Date.now() in ms, calculated from latest socket event
}

function computeElapsed(input: TimerInput): number {
  if (!input.startedAt) return input.elapsedSeconds;
  if (input.status !== "LIVE") return input.elapsedSeconds;
  const startedAtMs = new Date(input.startedAt).getTime();
  const nowMs = Date.now() + input.offset;
  return input.elapsedSeconds + Math.floor((nowMs - startedAtMs) / 1000);
}

function formatSeconds(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Returns { elapsedStr: "MM:SS", limitStr: "MM:SS", elapsedSeconds: number }
export function useMatchTimer(input: TimerInput) {
  const [elapsed, setElapsed] = useState(() => computeElapsed(input));
  const inputRef = useRef(input);
  inputRef.current = input;

  useEffect(() => {
    if (input.status !== "LIVE") {
      setElapsed(computeElapsed(input));
      return;
    }
    // Tick every second
    const id = setInterval(() => {
      setElapsed(computeElapsed(inputRef.current));
    }, 1000);
    // Immediate update when input changes
    setElapsed(computeElapsed(input));
    return () => clearInterval(id);
  }, [input.status, input.startedAt, input.elapsedSeconds, input.offset]);

  return {
    elapsedStr: formatSeconds(elapsed),
    limitStr: formatSeconds(input.limitSeconds),
    elapsedSeconds: elapsed,
  };
}
