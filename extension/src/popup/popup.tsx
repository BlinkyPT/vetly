import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

const APP_URL = __VETLY_API_URL__;

function Popup() {
  const [hasActiveTab, setHasActiveTab] = useState(false);
  const [onSerp, setOnSerp] = useState(false);
  const [tabUrl, setTabUrl] = useState<string>("");

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (!tab) return;
      setHasActiveTab(true);
      setTabUrl(tab.url ?? "");
      setOnSerp(!!tab.url && /https:\/\/www\.google\.[a-z.]+\/search/.test(tab.url));
    });
  }, []);

  async function runDeepAssessment() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { kind: "extractAndAssess" });
    window.close();
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[--color-vetly-green] text-white text-sm font-bold">V</span>
        <strong className="text-sm">Vetly</strong>
      </div>

      {onSerp ? (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Badges are being injected on this search. Click any badge for the methodology panel.
        </p>
      ) : hasActiveTab && /^https?:/.test(tabUrl) ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Run a deep trust assessment of this page?
          </p>
          <button onClick={runDeepAssessment} className="w-full rounded-md bg-[--color-vetly-green] px-3 py-1.5 text-sm font-medium text-white">
            Assess this page
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">Open a Google search or an article to use Vetly.</p>
      )}

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-xs">
        <a href={`${APP_URL}/dashboard`} target="_blank" rel="noreferrer" className="underline">Dashboard</a>
        <a href={`${APP_URL}/privacy`} target="_blank" rel="noreferrer" className="underline">Privacy</a>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
