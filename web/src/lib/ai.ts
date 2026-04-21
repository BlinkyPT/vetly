import { generateObject } from "ai";
import { LLMSignals } from "@vetly/shared";

const MODEL = "anthropic/claude-haiku-4-5";

/**
 * Calls Claude Haiku 4.5 via the Vercel AI Gateway with a Zod schema so the
 * response is always well-typed. We deliberately do not install
 * @ai-sdk/anthropic — the gateway handles provider selection.
 */
export async function classifyContentLLM(params: {
  url: string;
  title?: string;
  content: string;
}): Promise<typeof LLMSignals._type> {
  const { url, title, content } = params;

  const prompt = `You are assessing a web page for signals of trustworthiness.

URL: ${url}
Title: ${title ?? "(none)"}

Main content (truncated):
"""
${content.slice(0, 12_000)}
"""

Assess this content on three dimensions:

1. AI-GENERATED CONTENT probability (0.0 - 1.0). Indicators include stilted phrasing, superlative density, translation-flavoured English, absence of specific nouns/dates/people, and list-of-three patterns. Cite short quotes as evidence.

2. EDITORIAL BIAS MARKERS. Pick any that apply: partisan_framing, unsupported_claim, emotional_loading, straw_man, cherry_picking. If the content is neutral and well-sourced, return ["none_observed"].

3. EXPERTISE FIT (0.0 - 1.0). Does the author show topical authority that matches the claim area? A medical article citing studies scores high; a pseudonymous blog with vibes scores low.

Be fair and calibrated. Neutral mainstream journalism is not biased just because it has a perspective. Opinion pieces that are clearly marked as such are not "unsupported_claim".`;

  const { object } = await generateObject({
    model: MODEL,
    schema: LLMSignals,
    prompt,
    temperature: 0.2,
  });
  return object;
}
