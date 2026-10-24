import type { Metadata } from "next";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingHero } from "../components/landing/LandingHero";
import { LandingSteps } from "../components/landing/LandingSteps";
import { LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingCta } from "../components/landing/LandingCta";
import { LandingFooter } from "../components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Futix | Seu racha, organizado",
  description:
    "Salas por partida, aprovação do organizador, times sorteados com equilíbrio e placar ao vivo. Chega de grupo de WhatsApp bagunçado.",
  openGraph: {
    title: "Futix | Seu racha, organizado",
    description:
      "Salas por partida, aprovação do organizador, times sorteados com equilíbrio e placar ao vivo.",
    type: "website",
    locale: "pt_BR",
    siteName: "Futix",
    images: [{ url: "/logo-futix.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Futix | Seu racha, organizado",
    description:
      "Salas por partida, aprovação do organizador, times sorteados com equilíbrio e placar ao vivo.",
    images: ["/logo-futix.png"],
  },
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-app">
      <LandingNav />
      <LandingHero />
      <LandingSteps />
      <LandingFeatures />
      <LandingCta />
      <LandingFooter />
    </div>
  );
}
