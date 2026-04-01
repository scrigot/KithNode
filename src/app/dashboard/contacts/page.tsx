import { ContactsTable } from "./contacts-table";

export default function ContactsPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-text-primary">Warm Signals</h2>
      <p className="mt-1 text-xs text-text-muted">
        Contacts ranked by priority score
      </p>
      <div className="mt-6">
        <ContactsTable />
      </div>
    </div>
  );
}
