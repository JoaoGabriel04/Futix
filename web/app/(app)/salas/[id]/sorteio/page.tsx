import { SorteioClient } from "./SorteioClient";

export default async function SorteioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SorteioClient id={id} />;
}
