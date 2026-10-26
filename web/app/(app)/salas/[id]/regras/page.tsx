import { RegrasClient } from "./RegrasClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RegrasPage({ params }: Props) {
  const { id } = await params;
  return <RegrasClient id={id} />;
}
