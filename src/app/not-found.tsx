import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <div className="max-w-md text-center">
        <p className="font-heading text-7xl font-semibold tracking-tight text-text-primary">404</p>
        <h1 className="mt-4 font-heading text-3xl font-semibold text-text-primary">This page moved.</h1>
        <p className="mt-3 text-base leading-7 text-text-secondary">
          The record may have been archived, or this link belongs to an older KithNode workspace.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary/90"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
