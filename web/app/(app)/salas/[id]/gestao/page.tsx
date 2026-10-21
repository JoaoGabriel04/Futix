import { GestaoClient } from "./GestaoClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GestaoPage({ params }: PageProps) {
  const { id } = await params;
  return <GestaoClient id={id} />;
}
