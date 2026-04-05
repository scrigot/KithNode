import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A1628]">
      <div className="text-center">
        <p className="font-mono text-6xl font-bold text-white">404</p>
        <p className="mt-2 text-sm text-white/50">Page not found</p>
        <Link
          href="/"
          className="mt-6 inline-block bg-accent-teal px-4 py-2 text-sm text-white hover:bg-accent-teal/80"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
