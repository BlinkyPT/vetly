import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { BYOK_MODELS, DEFAULT_BYOK_SETTINGS, type ByokSettings } from "@vetly/shared/byok";
import { getByokSettings, setByokSettings } from "@/lib/byok";

const APP_URL = __VETLY_API_URL__;

type Settings = {
  showOnSerp: boolean;
  allowList: string[];
  denyList: string[];
};

const DEFAULTS: Settings = { showOnSerp: true, allowList: [], denyList: [] };

function useSettings(): [Settings, (next: Partial<Settings>) => void] {
  const [state, setState] = useState<Settings>(DEFAULTS);
  useEffect(() => {
    chrome.storage.sync.get("vetly_settings").then((r) => {
      if (r.vetly_settings) setState({ ...DEFAULTS, ...r.vetly_settings });
    });
  }, []);
  function update(next: Partial<Settings>) {
    const merged = { ...state, ...next };
    setState(merged);
    chrome.storage.sync.set({ vetly_settings: merged });
  }
  return [state, update];
}

function useByok(): [ByokSettings, (next: Partial<ByokSettings>) => void] {
  const [state, setState] = useState<ByokSettings>(DEFAULT_BYOK_SETTINGS);
  useEffect(() => { getByokSettings().then(setState); }, []);
  function update(next: Partial<ByokSettings>) {
    const merged = { ...state, ...next };
    setState(merged);
    setByokSettings(merged);
  }
  return [state, update];
}

function Options() {
  const [settings, update] = useSettings();
  const [byok, updateByok] = useByok();
  const [allowText, setAllowText] = useState("");
  const [denyText, setDenyText] = useState("");
  const [testing, setTesting] = useState<"idle" | "pending" | "ok" | "fail">("idle");
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    setAllowText(settings.allowList.join("\n"));
    setDenyText(settings.denyList.join("\n"));
  }, [settings]);

  function saveLists() {
    update({
      allowList: allowText.split("\n").map((s) => s.trim()).filter(Boolean),
      denyList: denyText.split("\n").map((s) => s.trim()).filter(Boolean),
    });
  }

  async function testKey() {
    setTesting("pending");
    setTestError(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": byok.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: byok.model,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      if (res.ok) setTesting("ok");
      else {
        const body = await res.text();
        setTesting("fail");
        setTestError(`${res.status}: ${body.slice(0, 200)}`);
      }
    } catch (err) {
      setTesting("fail");
      setTestError((err as Error).message);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Vetly settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage display, BYOK mode, and custom lists.</p>
      </header>

      <section className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.showOnSerp} onChange={(e) => update({ showOnSerp: e.target.checked })} />
          Show trust badges on Google search results
        </label>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="font-semibold">Bring your own Anthropic key (BYOK)</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paste your own Anthropic API key and Vetly will call Claude directly from your browser.
          Page content <strong>never touches our server</strong> — stronger privacy, and you pay Anthropic directly.
          The key lives only in <code>chrome.storage.sync</code> on your own machine.
        </p>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={byok.enabled} onChange={(e) => updateByok({ enabled: e.target.checked })} />
          Use my own key for deep assessments
        </label>

        <div>
          <label className="text-sm font-medium block">Anthropic API key</label>
          <input
            type="password"
            placeholder="sk-ant-…"
            value={byok.apiKey}
            onChange={(e) => updateByok({ apiKey: e.target.value })}
            className="mt-1 w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 text-sm font-mono dark:bg-slate-900"
          />
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline">
            Create a key at console.anthropic.com
          </a>
        </div>

        <div>
          <label className="text-sm font-medium block">Model</label>
          <select
            value={byok.model}
            onChange={(e) => updateByok({ model: e.target.value })}
            className="mt-1 w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 text-sm dark:bg-slate-900"
          >
            {BYOK_MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={byok.contributeToSharedCache} onChange={(e) => updateByok({ contributeToSharedCache: e.target.checked })} />
          <span>
            Share my anonymous assessment results with the Vetly community cache, so other users don&apos;t have to re-score the same article.
            Only the score and signals are shared — never the page content or your identity.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={testKey} disabled={!byok.apiKey || testing === "pending"} className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm">
            {testing === "pending" ? "Testing…" : "Test key"}
          </button>
          {testing === "ok" && <span className="text-sm text-[--color-vetly-green]">✓ key works</span>}
          {testing === "fail" && <span className="text-sm text-[--color-vetly-red]">✗ {testError}</span>}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 p-5 dark:border-slate-800">
        <h2 className="font-semibold">Custom lists</h2>
        <div>
          <label className="text-sm font-medium">Allow-list (always show green)</label>
          <textarea rows={4} className="mt-1 w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 text-sm font-mono dark:bg-slate-900" value={allowText} onChange={(e) => setAllowText(e.target.value)} placeholder="example.com" />
        </div>
        <div>
          <label className="text-sm font-medium">Deny-list (always show red)</label>
          <textarea rows={4} className="mt-1 w-full border border-slate-300 dark:border-slate-700 rounded-md p-2 text-sm font-mono dark:bg-slate-900" value={denyText} onChange={(e) => setDenyText(e.target.value)} placeholder="spamsite.example" />
        </div>
        <button onClick={saveLists} className="rounded-md bg-[--color-vetly-green] text-white px-4 py-1.5 text-sm font-medium">Save lists</button>
      </section>

      <section className="text-sm">
        <a className="underline" href={`${APP_URL}/dashboard`} target="_blank" rel="noreferrer">Open dashboard</a>
        {" · "}
        <a className="underline" href={`${APP_URL}/privacy`} target="_blank" rel="noreferrer">Privacy</a>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Options />);
