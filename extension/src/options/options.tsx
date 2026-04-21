import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

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

function Options() {
  const [settings, update] = useSettings();
  const [allowText, setAllowText] = useState("");
  const [denyText, setDenyText] = useState("");

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

  return (
    <main className="max-w-xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Vetly settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account, allow/deny lists, and display options.</p>
      </header>

      <section className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={settings.showOnSerp} onChange={(e) => update({ showOnSerp: e.target.checked })} />
          Show trust badges on Google search results
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Custom lists <span className="text-xs font-normal text-slate-500">(Pro)</span></h2>
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
