import { PartidaClient } from "./PartidaClient";

export default async function PartidaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartidaClient id={id} />;
}
