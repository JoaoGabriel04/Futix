import { PesosClient } from "./PesosClient";

export default async function PesosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PesosClient id={id} />;
}
