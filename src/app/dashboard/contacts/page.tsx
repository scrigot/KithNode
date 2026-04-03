import { ContactsList } from "./contacts-list";

export default function ContactsPage() {
  return (
    <div className="p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          WARM SIGNALS
        </h2>
        <span className="text-[10px] text-muted-foreground">
          RANKED BY PRIORITY SCORE
        </span>
      </div>
      <div className="mb-4 h-px bg-border" />
      <ContactsList />
    </div>
  );
}
