"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export function useOfflineToast() {
  useEffect(() => {
    let toastId: string | number | undefined;

    function handleOffline() {
      toastId = toast.warning("Sem conexão com a internet.", {
        id: "offline",
        duration: Infinity,
      });
    }

    function handleOnline() {
      toast.dismiss(toastId);
      toast.success("Conexão restabelecida.", { id: "online", duration: 3000 });
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);
}
