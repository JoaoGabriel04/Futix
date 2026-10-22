import { RegrasClient } from "./RegrasClient";

export default async function RegrasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RegrasClient id={id} />;
}
