'use client';

import { useCallback, useEffect, useState, useTransition, type FormEvent } from 'react';

interface KeyMeta {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

const SCOPE_OPTIONS = ['ingest', 'agent', 'read', 'admin'] as const;

/**
 * Minimal API key management for ASA settings.
 * Claude may replace with richer UX; this is a real (non-mock) surface.
 */
export default function LaunchpadApiKeysPage() {
  const [keys, setKeys] = useState<KeyMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['ingest']);
  const [plaintextOnce, setPlaintextOnce] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      setHint(null);
      try {
        const res = await fetch('/api/fusarium/launchpad/keys');
        const json = (await res.json()) as {
          keys?: KeyMeta[];
          error?: string;
          hint?: string;
        };
        if (!res.ok) {
          setError(json.error ?? `HTTP ${res.status}`);
          setHint(json.hint ?? null);
          setKeys([]);
          return;
        }
        setKeys(json.keys ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'load failed');
      }
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setPlaintextOnce(null);
    startTransition(async () => {
      setError(null);
      const res = await fetch('/api/fusarium/launchpad/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes }),
      });
      const json = (await res.json()) as {
        error?: string;
        plaintextKey?: string;
        warning?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setPlaintextOnce(json.plaintextKey ?? null);
      setName('');
      load();
    });
  }

  function onRevoke(id: string) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/fusarium/launchpad/keys?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      load();
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 sm:p-6 md:p-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">API keys</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Per-company keys for Contract Radar ingest and Local Assurance Agent results. Plaintext is
          shown once; only a hash is stored.
        </p>
      </header>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          {error}
          {hint ? <p className="mt-1 text-muted-foreground">{hint}</p> : null}
        </div>
      ) : null}

      {plaintextOnce ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm" role="status">
          <p className="font-medium">Copy this key now — it will not be shown again.</p>
          <code className="mt-2 block break-all text-base">{plaintextOnce}</code>
        </div>
      ) : null}

      <form onSubmit={onCreate} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span>Name</span>
          <input
            className="h-12 rounded-md border bg-background px-3 text-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. SAM collector"
            required
            minLength={1}
            maxLength={80}
          />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">Scopes</legend>
          <div className="flex flex-wrap gap-3">
            {SCOPE_OPTIONS.map((scope) => (
              <label key={scope} className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                />
                {scope}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={pending || scopes.length === 0}
          className="min-h-[44px] w-full rounded-md bg-foreground px-4 py-3 text-background disabled:opacity-50 md:w-auto"
        >
          {pending ? 'Working…' : 'Create key'}
        </button>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Existing keys</h2>
        {keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No API keys yet. Create one above — real data only; nothing is invented.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-col gap-2 border-b border-border py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium">{k.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {k.keyPrefix}… · {k.scopes.join(', ')}
                    {k.revokedAt ? ' · revoked' : ''}
                  </p>
                </div>
                {!k.revokedAt ? (
                  <button
                    type="button"
                    className="min-h-[44px] min-w-[44px] rounded-md border px-4 text-sm"
                    onClick={() => onRevoke(k.id)}
                    disabled={pending}
                  >
                    Revoke
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
