const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type WordMeaning = { tamil: string; english: string };

function readOutputText(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const response = result as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await request.json() as {
      phraseEnglish?: string;
      tamilRomanized?: string;
      words?: WordMeaning[];
    };
    const words = body.words;
    if (
      !Array.isArray(words) ||
      words.length < 2 ||
      words.length > 12 ||
      words.some((word) => !word || typeof word.tamil !== "string" || typeof word.english !== "string")
    ) {
      return Response.json({ error: "Invalid reviewed word map" }, { status: 400, headers: corsHeaders });
    }

    const fallback = { kind: "tamil-from-english", targetIndex: 0 };
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_TUTOR_MODEL");
    if (!apiKey || !model) return Response.json(fallback, { headers: corsHeaders });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "Choose one useful micro-challenge for a 7-year-old learning spoken Tamil. Use only the supplied reviewed phrase and word map. Prefer a meaningful content word over a grammatical particle. Vary the challenge kind. Return only the required structured choice.",
          },
          {
            role: "user",
            content: JSON.stringify({
              phraseEnglish: String(body.phraseEnglish ?? "").slice(0, 200),
              tamilRomanized: String(body.tamilRomanized ?? "").slice(0, 300),
              words,
            }),
          },
        ],
        store: false,
        reasoning: { effort: "minimal" },
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "word_challenge",
            strict: true,
            schema: {
              type: "object",
              properties: {
                kind: {
                  type: "string",
                  enum: ["tamil-from-english", "english-from-tamil", "missing-word"],
                },
                targetIndex: { type: "integer", minimum: 0, maximum: words.length - 1 },
              },
              required: ["kind", "targetIndex"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const result = await response.json();
    const outputText = readOutputText(result);
    if (!outputText) throw new Error("OpenAI returned no word challenge");
    const parsed = JSON.parse(outputText);
    const validKind = ["tamil-from-english", "english-from-tamil", "missing-word"].includes(parsed.kind);
    const validIndex = Number.isInteger(parsed.targetIndex) && parsed.targetIndex >= 0 && parsed.targetIndex < words.length;
    return Response.json(validKind && validIndex ? parsed : fallback, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Word challenge failed" },
      { status: 500, headers: corsHeaders }
    );
  }
});
