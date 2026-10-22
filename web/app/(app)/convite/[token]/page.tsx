import { ConviteClient } from "./ConviteClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ConvitePage({ params }: PageProps) {
  const { token } = await params;
  return <ConviteClient token={token} />;
}
