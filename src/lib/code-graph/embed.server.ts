// Batch embedding via the Lovable AI Gateway.
// Uses google/gemini-embedding-001 (3072 dims), max 100 inputs per request.

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "google/gemini-embedding-001";
const BATCH = 100;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY not configured");

  const out: number[][] = new Array(texts.length);
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH).map((t) => t.slice(0, 6000)); // ~2K tokens cap
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ model: MODEL, input: slice }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Embed [${res.status}]: ${body.slice(0, 200)}`);
    }
    const j = await res.json() as { data: Array<{ index: number; embedding: number[] }> };
    for (const d of j.data) out[i + d.index] = d.embedding;
  }
  return out;
}

// pgvector wants a stringified array literal like "[0.1,0.2,...]"
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
