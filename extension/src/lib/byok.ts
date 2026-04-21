import { DEFAULT_BYOK_SETTINGS, type ByokSettings } from "@vetly/shared/byok";

const KEY = "vetly_byok";

export async function getByokSettings(): Promise<ByokSettings> {
  const r = await chrome.storage.sync.get(KEY);
  return { ...DEFAULT_BYOK_SETTINGS, ...(r[KEY] ?? {}) };
}

export async function setByokSettings(next: ByokSettings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: next });
}
