import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Vetly — source-trust signals for Google",
  short_name: "Vetly",
  description: "Annotates Google search results with a green/amber/red trust badge. Signal, not gate.",
  version: "0.1.0",
  action: {
    default_title: "Vetly",
    default_popup: "src/popup/index.html",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: [
        "https://www.google.com/search*",
        "https://www.google.co.uk/search*",
        "https://www.google.ca/search*",
        "https://www.google.com.au/search*",
        "https://www.google.de/search*",
        "https://www.google.fr/search*",
        "https://www.google.es/search*",
        "https://www.google.it/search*",
        "https://www.google.com.br/search*",
        "https://www.google.co.jp/search*",
        "https://www.google.co.in/search*",
      ],
      js: ["src/content/serp.tsx"],
      run_at: "document_idle",
    },
    {
      matches: ["<all_urls>"],
      exclude_matches: [
        "https://www.google.com/search*",
        "https://*.google.com/*",
        "https://*.google.co.uk/*",
        "https://accounts.google.com/*",
        "chrome://*/*",
        "chrome-extension://*/*",
      ],
      js: ["src/content/page.tsx"],
      run_at: "document_idle",
    },
  ],
  permissions: ["storage", "activeTab"],
  host_permissions: ["https://*/*"],
  web_accessible_resources: [
    {
      resources: ["src/content/*", "assets/*"],
      matches: ["<all_urls>"],
    },
  ],
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png",
  },
});
