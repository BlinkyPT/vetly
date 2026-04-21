/**
 * Re-exports the isomorphic url-hash utilities from @vetly/shared.
 * Previously had a Node-only version; unified so extension + server
 * always produce identical hashes.
 */
export { normaliseUrl, hashUrl, extractDomain } from "@vetly/shared/url-hash";
