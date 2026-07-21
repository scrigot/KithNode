import { redirect } from "next/navigation";

export default function PreferenceSettingsPage() {
  redirect("/dashboard/settings?section=outreach");
}
