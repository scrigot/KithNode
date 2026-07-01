"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Opens the contact modal by merging ?contact=<id> into the CURRENT url (so it
// works from any /me page and preserves existing query like ?q=/filters).
export function useOpenContact() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (id: string, tab?: "profile" | "memory" | "actions" | "timeline", draftMode?: "first" | "follow_up") => {
    const next = new URLSearchParams(params.toString());
    next.set("contact", id);
    if (tab && tab !== "profile") next.set("contactTab", tab);
    else next.delete("contactTab");
    if (draftMode) next.set("draftMode", draftMode);
    else next.delete("draftMode");
    router.push(`${pathname}?${next.toString()}`);
  };
}

export default function OpenContact({
  id,
  tab,
  draftMode,
  className,
  children,
}: {
  id: string;
  tab?: "profile" | "memory" | "actions" | "timeline";
  draftMode?: "first" | "follow_up";
  className?: string;
  children: React.ReactNode;
}) {
  const open = useOpenContact();
  return (
    <button type="button" onClick={() => open(id, tab, draftMode)} className={className}>
      {children}
    </button>
  );
}
