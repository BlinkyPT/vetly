const KEY = "vetly_device_id";

export async function getDeviceId(): Promise<string> {
  const existing = await chrome.storage.local.get(KEY);
  if (existing[KEY]) return existing[KEY];
  const id = crypto.randomUUID();
  await chrome.storage.local.set({ [KEY]: id });
  return id;
}
