export default function ContactsLoading() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mb-4">
          <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="overflow-hidden border border-gray-200">
          <div className="bg-gray-50 px-4 py-3">
            <div className="flex gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-200 bg-white">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-8 px-4 py-3">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
