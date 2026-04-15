import Link from "next/link";

export function SignInButton() {
  return (
    <Link
      href="/waitlist"
      className="inline-flex items-center rounded-lg bg-accent-teal px-8 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-accent-teal/90 hover:scale-[1.02] hover:shadow-lg hover:shadow-accent-teal/25"
    >
      Request Access
    </Link>
  );
}
