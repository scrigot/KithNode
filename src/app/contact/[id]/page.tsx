export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-bg-primary p-6">
      <p className="text-xs text-text-muted">Contact #{id}</p>
      <h2 className="mt-1 text-lg font-bold text-text-primary">
        Contact Detail
      </h2>
      <p className="mt-2 text-xs text-text-muted">
        Full score breakdown, signals, and affiliations. Coming in Story 7.
      </p>
    </div>
  );
}
