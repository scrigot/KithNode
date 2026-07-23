import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { accessibleCoffeePrepContact } from "@/lib/coffee-prep/contact";
import PrepWorkspace from "./prep-workspace";

export const dynamic = "force-dynamic";

export default async function CoffeePrepDetail({ params }: { params: Promise<{ contactId: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/sign-in?callbackUrl=/dashboard/coffee-prep");
  const { contactId } = await params;
  const access = await accessibleCoffeePrepContact(userId, contactId);
  if (!access) notFound();
  const contact = access.contact as Record<string, unknown>;
  const name = String(contact.name || "Contact");
  const linkedInUrl = String(contact.linkedInUrl || "");

  return (
    <div className="mx-auto max-w-5xl p-5">
      <Link href="/dashboard/coffee-prep" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"><ArrowLeft size={13} />All contacts</Link>
      <header className="mt-4 border-b border-border-soft pb-4">
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-xl font-bold">{name}</h1>{linkedInUrl && <a href={linkedInUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">LinkedIn <ExternalLink size={11} /></a>}</div>
        <p className="mt-1 text-sm text-muted-foreground">{[contact.title, contact.firmName].filter(Boolean).map(String).join(" · ") || "No role recorded"}</p>
      </header>
      <PrepWorkspace contactId={contactId} contactName={name} />
    </div>
  );
}
