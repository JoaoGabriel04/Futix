import type { Metadata } from "next";
import { Suspense } from "react";
import { EntrarClient } from "./EntrarClient";

export const metadata: Metadata = {
  title: "Entrar | Futix",
  description: "Entre na sua conta Futix.",
};

export default function EntrarPage() {
  return (
    <Suspense>
      <EntrarClient />
    </Suspense>
  );
}
