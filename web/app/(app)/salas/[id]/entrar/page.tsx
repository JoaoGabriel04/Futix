import { EntrarPageClient } from "./EntrarPageClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EntrarPage({ params }: PageProps) {
  const { id } = await params;
  return <EntrarPageClient id={id} />;
}
