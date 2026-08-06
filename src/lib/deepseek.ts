/**
 * DeepSeek API client (OpenAI-compatible chat completions).
 * Model defaults to `deepseek-v4-flash`; override with DEEPSEEK_MODEL.
 * All calls fail-open: errors return null and callers fall back to
 * rule-based paths.
 */
export async function chatCompletion(input: {
  system: string;
  user: string;
  temperature?: number;
  json?: boolean;
  maxTokens?: number;
}): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 800,
        ...(input.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

/** Strips markdown fences around JSON if the model wraps the response. */
export function extractJson(text: string | null): unknown | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}