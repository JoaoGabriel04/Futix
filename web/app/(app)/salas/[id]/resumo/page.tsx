import { ResumoClient } from "./ResumoClient";

export default async function ResumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ResumoClient id={id} />;
}
