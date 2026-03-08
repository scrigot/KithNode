export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
        KithNode
      </h1>
      <p className="mt-4 max-w-lg text-center text-lg text-gray-600">
        Build authentic connections with alumni who&apos;ve walked your path.
        Intelligence-driven networking for IB, PE, and Consulting recruiting.
      </p>
      <a
        href="/dashboard"
        className="mt-8 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 transition-colors"
      >
        Get Started
      </a>
    </main>
  );
}
