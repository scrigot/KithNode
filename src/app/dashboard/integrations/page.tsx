"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Copy, KeyRound, Loader2, Mail, Plug, RefreshCw, Unplug } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { JobSourceSettings } from "./job-source-settings";

type Provider = "google" | "microsoft";
interface IntegrationState {
  provider: Provider;
  configured: boolean;
  connection: null | {
    email: string;
    scopes: string;
    status: string;
    lastCheckedAt: string | null;
    lastError: string;
  };
}
interface Preview {
  messages: Array<{ id: string; subject: string; from: string; receivedAt: string }>;
  events: Array<{ id: string; title: string; start: string; location: string }>;
}
interface ServiceState {
  id: string;
  label: string;
  configured: boolean;
  validation: string;
  optional?: boolean;
}
interface ExtensionToken { id: string; name: string; revokedAt: string | null; lastUsedAt: string | null; createdAt: string }

const LABELS: Record<Provider, { name: string; detail: string }> = {
  google: { name: "Google Workspace", detail: "Gmail and Google Calendar · read-only" },
  microsoft: { name: "Microsoft 365", detail: "Outlook and Microsoft Calendar · read-only" },
};

export default function IntegrationsPage() {
  const [items, setItems] = useState<IntegrationState[]>([]);
  const [services, setServices] = useState<ServiceState[]>([]);
  const [preview, setPreview] = useState<Record<string, Preview>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [extensionTokens, setExtensionTokens] = useState<ExtensionToken[]>([]);
  const [newExtensionToken, setNewExtensionToken] = useState("");
  const [appOrigin, setAppOrigin] = useState("http://localhost:3000");

  const load = useCallback(async () => {
    const response = await apiFetch("/api/integrations");
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not load integrations");
    setItems(data.integrations || []);
    setServices(data.services || []);
    const tokenResponse = await apiFetch("/api/extension/token");
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (tokenResponse.ok) setExtensionTokens(tokenData.tokens || []);
  }, []);

  useEffect(() => {
    setAppOrigin(window.location.origin);
    const oauthError = new URLSearchParams(window.location.search).get("error");
    if (oauthError) setError(`Connection failed: ${oauthError.replaceAll("_", " ")}`);
    load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load integrations"));
  }, [load]);

  async function test(provider: Provider) {
    setBusy(`${provider}:test`);
    setError("");
    try {
      const response = await apiFetch(`/api/integrations/${provider}/test`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Connection test failed");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connection test failed");
    } finally {
      setBusy("");
    }
  }

  async function inspect(provider: Provider) {
    setBusy(`${provider}:preview`);
    setError("");
    try {
      const response = await apiFetch(`/api/integrations/${provider}/preview`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Provider preview failed");
      setPreview((current) => ({ ...current, [provider]: data }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Provider preview failed");
    } finally {
      setBusy("");
    }
  }

  async function disconnect(provider: Provider) {
    setBusy(`${provider}:disconnect`);
    setError("");
    try {
      const response = await apiFetch("/api/integrations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!response.ok) throw new Error("Disconnect failed");
      setPreview((current) => ({ ...current, [provider]: { messages: [], events: [] } }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Disconnect failed");
    } finally {
      setBusy("");
    }
  }

  async function createExtensionToken() {
    setBusy("extension:create");
    setError("");
    try {
      const response = await apiFetch("/api/extension/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Chrome extension" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not create pairing token");
      setNewExtensionToken(data.token || "");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not create pairing token"); }
    finally { setBusy(""); }
  }

  async function revokeExtensionToken(id: string) {
    setBusy(`extension:${id}`);
    setError("");
    try {
      const response = await apiFetch("/api/extension/token", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) throw new Error("Could not revoke pairing token");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not revoke pairing token"); }
    finally { setBusy(""); }
  }

  return (
    <div className="mx-auto max-w-5xl p-5">
      <header className="mb-5">
        <div className="flex items-center gap-2 text-primary"><Plug size={18} /><h1 className="text-lg font-bold">Connected accounts</h1></div>
        <p className="mt-1 text-sm text-muted-foreground">Read-only email and calendar access. Tokens are encrypted server-side and never sent to the browser or model.</p>
      </header>
      {error && <div className="mb-4 border border-accent-red/30 bg-accent-red/10 p-3 text-sm text-accent-red">{error}</div>}
      <JobSourceSettings />
      <section className="mb-5 border border-white/[0.08] bg-card p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Server credential readiness</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <div key={service.id} className="border border-white/[0.08] bg-background p-3">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <span className={`h-2 w-2 rounded-full ${service.configured ? "bg-accent-green" : "bg-accent-amber"}`} />
                {service.label}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {service.configured || service.optional ? service.validation : "Missing required environment variable"}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Only readiness states are returned. Secret values never leave the server.</p>
        <div className="mt-4 border-t border-white/[0.08] pt-4">
          <p className="text-xs font-semibold">OAuth redirect URIs</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Add these exact URIs to the provider console. Connected-account access uses a different callback from Google sign-in.</p>
          {[
            { label: "Google sign-in", callback: `${appOrigin}/api/auth/callback/google` },
            { label: "Google mail/calendar", callback: `${appOrigin}/api/integrations/google/callback` },
            { label: "Microsoft mail/calendar", callback: `${appOrigin}/api/integrations/microsoft/callback` },
          ].map((item) => {
            return <div key={item.label} className="mt-2 grid items-center gap-2 sm:grid-cols-[150px_minmax(0,1fr)_auto]"><span className="text-[11px] text-muted-foreground">{item.label}</span><code className="min-w-0 overflow-hidden text-ellipsis border border-white/10 bg-background p-2 text-[11px]">{item.callback}</code><button type="button" onClick={() => navigator.clipboard.writeText(item.callback)} className="inline-flex items-center justify-center gap-1 border border-white/10 px-2 py-2 text-[11px]"><Copy size={11} />Copy</button></div>;
          })}
        </div>
      </section>
      <section className="mb-5 border border-white/[0.08] bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="flex items-center gap-2 font-semibold"><KeyRound size={15} />LinkedIn clipper pairing</h2><p className="mt-1 text-xs text-muted-foreground">Create a revocable token for the unpacked extension. It can save only profiles you explicitly open, review, and submit.</p></div>
          <button type="button" onClick={createExtensionToken} disabled={Boolean(busy)} className="bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Create token</button>
        </div>
        {newExtensionToken && <div className="mt-4 border border-accent-amber/30 bg-accent-amber/5 p-3"><p className="text-xs text-accent-amber">Copy this now; it cannot be shown again.</p><div className="mt-2 flex gap-2"><code className="min-w-0 flex-1 overflow-hidden text-ellipsis border border-white/10 bg-background p-2 text-xs">{newExtensionToken}</code><button type="button" onClick={() => navigator.clipboard.writeText(newExtensionToken)} className="flex items-center gap-1 border border-white/10 px-2 text-xs"><Copy size={12} />Copy</button></div></div>}
        <div className="mt-3 space-y-2">{extensionTokens.filter((token) => !token.revokedAt).map((token) => <div key={token.id} className="flex items-center justify-between border border-white/[0.08] bg-background p-3 text-xs"><div><p className="font-medium">{token.name}</p><p className="mt-0.5 text-muted-foreground">{token.lastUsedAt ? `Last used ${new Date(token.lastUsedAt).toLocaleString()}` : "Never used"}</p></div><button type="button" onClick={() => revokeExtensionToken(token.id)} disabled={Boolean(busy)} className="text-accent-red disabled:opacity-50">Revoke</button></div>)}</div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const info = LABELS[item.provider];
          const connected = Boolean(item.connection);
          const sample = preview[item.provider];
          return (
            <section key={item.provider} className="border border-white/[0.08] bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-semibold">{info.name}</h2><p className="text-xs text-muted-foreground">{info.detail}</p></div>
                {connected ? <span className="flex items-center gap-1 text-xs text-accent-green"><CheckCircle2 size={13} />{item.connection?.status}</span> : null}
              </div>
              {!item.configured && <p className="mt-4 text-xs text-accent-amber">Provider client ID, secret, or token-encryption key is missing.</p>}
              {connected ? (
                <div className="mt-4 space-y-3">
                  <div className="border border-white/[0.08] bg-background p-3 text-xs">
                    <p className="font-medium">{item.connection?.email}</p>
                    <p className="mt-1 text-muted-foreground">Last checked: {item.connection?.lastCheckedAt ? new Date(item.connection.lastCheckedAt).toLocaleString() : "not yet"}</p>
                    {item.connection?.lastError && <p className="mt-1 text-accent-red">{item.connection.lastError}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => test(item.provider)} disabled={Boolean(busy)} className="flex items-center gap-1 bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw size={12} /> Validate connection</button>
                    <button onClick={() => inspect(item.provider)} disabled={Boolean(busy)} className="border border-white/10 px-3 py-2 text-xs disabled:opacity-50">Preview data</button>
                    <button onClick={() => disconnect(item.provider)} disabled={Boolean(busy)} className="flex items-center gap-1 border border-accent-red/30 px-3 py-2 text-xs text-accent-red disabled:opacity-50"><Unplug size={12} /> Disconnect</button>
                  </div>
                  {busy.startsWith(item.provider) && <p className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Checking provider…</p>}
                  {sample && (
                    <div className="grid gap-3 pt-2">
                      <div><p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground"><Mail size={12} /> Recent mail</p>{sample.messages.slice(0, 4).map((message) => <div key={message.id} className="border-t border-white/[0.06] py-2 text-xs"><p className="font-medium">{message.subject}</p><p className="truncate text-muted-foreground">{message.from}</p></div>)}</div>
                      <div><p className="mb-2 flex items-center gap-1 text-xs font-bold uppercase text-muted-foreground"><CalendarDays size={12} /> Upcoming</p>{sample.events.slice(0, 4).map((event) => <div key={event.id} className="border-t border-white/[0.06] py-2 text-xs"><p className="font-medium">{event.title}</p><p className="text-muted-foreground">{event.start ? new Date(event.start).toLocaleString() : "No time"}{event.location ? ` · ${event.location}` : ""}</p></div>)}</div>
                    </div>
                  )}
                </div>
              ) : (
                <a href={`/api/integrations/${item.provider}/connect`} className={`mt-4 inline-flex items-center gap-2 bg-primary px-3 py-2 text-xs font-semibold text-white ${!item.configured ? "pointer-events-none opacity-40" : ""}`}><Plug size={13} /> Connect {info.name}</a>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-5 text-xs text-muted-foreground">Email bodies are not imported. Preview and assistant context use bounded metadata only; external sends and calendar writes remain disabled until an approval-backed write connector is added.</p>
    </div>
  );
}
