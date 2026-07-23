import { redirect } from "next/navigation";

function appendParam(
  target: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    value.forEach((item) => target.append(key, item));
  } else if (value !== undefined) {
    target.set(key, value);
  }
}

export default async function LegacyAssistantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const incoming = await searchParams;
  const target = new URLSearchParams();
  Object.entries(incoming).forEach(([key, value]) =>
    appendParam(target, key, value),
  );
  target.set("from", "assistant");
  redirect(`/dashboard${target.size ? `?${target.toString()}` : ""}`);
}
