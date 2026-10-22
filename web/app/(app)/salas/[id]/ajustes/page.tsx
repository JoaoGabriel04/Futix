import { AjustesClient } from "./AjustesClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AjustesPage({ params }: PageProps) {
  const { id } = await params;
  return <AjustesClient id={id} />;
}
