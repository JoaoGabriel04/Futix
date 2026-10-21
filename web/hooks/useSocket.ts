"use client";

import { useEffect, useState } from "react";
import { type Socket } from "socket.io-client";
import { getSocket } from "../lib/socket";

interface UseSocketOptions {
  roomId: string;
  onMemberRequested?: (data: unknown) => void;
  onMemberUpdated?: (data: unknown) => void;
  onRoomUpdated?: (data: unknown) => void;
}

/**
 * Hook for managing Socket.IO connection to a specific room.
 * - Connects on mount
 * - Emits room:join with roomId
 * - Registers event listeners for member and room updates
 * - Cleans up: emits room:leave and disconnects on unmount
 */
export function useSocket({
  roomId,
  onMemberRequested,
  onMemberUpdated,
  onRoomUpdated,
}: UseSocketOptions): { socket: Socket; isConnected: boolean } {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleMemberRequested = (data: unknown) => {
      onMemberRequested?.(data);
    };

    const handleMemberUpdated = (data: unknown) => {
      onMemberUpdated?.(data);
    };

    const handleRoomUpdated = (data: unknown) => {
      onRoomUpdated?.(data);
    };

    // Connect and join room
    socket.connect();
    socket.emit("room:join", roomId);

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    if (onMemberRequested) {
      socket.on("member:requested", handleMemberRequested);
    }

    if (onMemberUpdated) {
      socket.on("member:updated", handleMemberUpdated);
    }

    if (onRoomUpdated) {
      socket.on("room:updated", handleRoomUpdated);
    }

    // Cleanup
    return () => {
      socket.emit("room:leave", roomId);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("member:requested", handleMemberRequested);
      socket.off("member:updated", handleMemberUpdated);
      socket.off("room:updated", handleRoomUpdated);
      socket.disconnect();
    };
  }, [roomId, onMemberRequested, onMemberUpdated, onRoomUpdated]);

  return { socket: getSocket(), isConnected };
}
