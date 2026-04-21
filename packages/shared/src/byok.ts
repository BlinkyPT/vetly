import type { LLMSignals } from "./index.js";

/**
 * The JSON Schema (hand-rolled from the LLMSignals Zod schema) that we pass
 * to Claude via tool-use. Hand-rolling keeps the extension bundle small —
 * zod-to-json-schema would add ~5KB for a single schema.
 *
 * Keep in sync with `LLMSignals` in src/index.ts.
 */
export const LLM_SIGNALS_TOOL = {
  name: "record_assessment",
  description: "Record a structured trust assessment of a web page.",
  input_schema: {
    type: "object",
    properties: {
      ai_probability: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "Probability the content is LLM-generated (0-1).",
      },
      ai_evidence: {
        type: "array",
        items: { type: "string" },
        description: "Short quotes or patterns that support the AI probability.",
      },
      bias_markers: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "partisan_framing",
            "unsupported_claim",
            "emotional_loading",
            "straw_man",
            "cherry_picking",
            "none_observed",
          ],
        },
      },
      bias_notes: { type: "string" },
      expertise_fit: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "How well the content matches the claimed topic authority (0-1).",
      },
      expertise_notes: { type: "string" },
    },
    required: [
      "ai_probability",
      "ai_evidence",
      "bias_markers",
      "bias_notes",
      "expertise_fit",
      "expertise_notes",
    ],
  },
} as const;

export const ASSESSMENT_PROMPT = (args: { url: string; title?: string; content: string }) => `You are assessing a web page for signals of trustworthiness.

URL: ${args.url}
Title: ${args.title ?? "(none)"}

Main content (truncated):
"""
${args.content.slice(0, 12_000)}
"""

Assess this content on three dimensions:

1. AI-GENERATED CONTENT probability (0.0 - 1.0). Indicators include stilted phrasing, superlative density, translation-flavoured English, absence of specific nouns/dates/people, and list-of-three patterns. Cite short quotes as evidence.

2. EDITORIAL BIAS MARKERS. Pick any that apply: partisan_framing, unsupported_claim, emotional_loading, straw_man, cherry_picking. If the content is neutral and well-sourced, return ["none_observed"].

3. EXPERTISE FIT (0.0 - 1.0). Does the author show topical authority that matches the claim area? A medical article citing studies scores high; a pseudonymous blog with vibes scores low.

Be fair and calibrated. Neutral mainstream journalism is not biased just because it has a perspective. Opinion pieces that are clearly marked as such are not "unsupported_claim".

Call the record_assessment tool with your structured answer.`;

/**
 * Direct-to-Anthropic call, usable from an extension background worker.
 * No Node-specific APIs. Uses fetch + tool-use for structured output.
 */
export async function classifyWithUserKey(args: {
  apiKey: string;
  model?: string; // default "claude-haiku-4-5"
  url: string;
  title?: string;
  content: string;
}): Promise<LLMSignals> {
  const model = args.model ?? "claude-haiku-4-5";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": args.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      tools: [LLM_SIGNALS_TOOL],
      tool_choice: { type: "tool", name: LLM_SIGNALS_TOOL.name },
      messages: [
        {
          role: "user",
          content: ASSESSMENT_PROMPT({ url: args.url, title: args.title, content: args.content }),
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic ${res.status}: ${body.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: unknown }>;
  };
  const toolBlock = data.content.find((b) => b.type === "tool_use" && b.name === LLM_SIGNALS_TOOL.name);
  if (!toolBlock || !toolBlock.input) {
    throw new Error("Anthropic returned no tool_use block");
  }
  return toolBlock.input as LLMSignals;
}

export const BYOK_MODELS = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast, cheap)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (slower, sharper)" },
] as const;

export type ByokSettings = {
  enabled: boolean;
  apiKey: string;
  model: string;
  contributeToSharedCache: boolean;
};

export const DEFAULT_BYOK_SETTINGS: ByokSettings = {
  enabled: false,
  apiKey: "",
  model: "claude-haiku-4-5",
  contributeToSharedCache: false,
};
