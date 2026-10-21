import { PedidoPageClient } from "./PedidoPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PedidoPage({ params }: PageProps) {
  const { id } = await params;
  return <PedidoPageClient id={id} />;
}
