import { redirect } from "next/navigation";

export default async function LegacyContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/contact/${id}`);
}
