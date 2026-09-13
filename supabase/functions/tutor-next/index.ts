const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Encounter = {
  type: "learn" | "recognize" | "reverse-recognize" | "build-it" | "say-it" | "cluster";
  phraseId: string;
  promptId?: string;
};

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
      previousCorrect?: boolean | null;
      wrongStreak?: number;
      candidates?: Encounter[];
    };
    const candidates = body.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return Response.json({ error: "No candidates" }, { status: 400, headers: corsHeaders });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_TUTOR_MODEL");
    if (!apiKey || !model) {
      return Response.json({ encounter: candidates[0] }, { headers: corsHeaders });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You guide a 7-year-old through a spoken Tamil creature game. Select exactly one supplied candidate. Never invent Tamil, phrase IDs, prompt IDs, or activity types. After a wrong answer, prefer easier listening or recognition and use support. After a correct answer, prefer a different modality or related challenge and use stretch. Otherwise use steady.",
          },
          {
            role: "user",
            content: JSON.stringify({
              previousCorrect: typeof body.previousCorrect === "boolean" ? body.previousCorrect : null,
              wrongStreak: Number.isInteger(body.wrongStreak) ? Math.max(0, body.wrongStreak as number) : 0,
              candidates,
            }),
          },
        ],
        store: false,
        reasoning: { effort: "minimal" },
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "tutor_choice",
            strict: true,
            schema: {
              type: "object",
              properties: {
                candidateIndex: { type: "integer", minimum: 0, maximum: candidates.length - 1 },
                coachTone: { type: "string", enum: ["steady", "stretch", "support"] },
              },
              required: ["candidateIndex", "coachTone"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI returned ${response.status}`);
    const result = await response.json();
    const outputText = readOutputText(result);
    if (!outputText) throw new Error("OpenAI returned no tutor choice");
    const parsed = JSON.parse(outputText);
    const encounter = candidates[parsed.candidateIndex] ?? candidates[0];
    return Response.json({ encounter, coachTone: parsed.coachTone }, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Tutor failed" },
      { status: 500, headers: corsHeaders }
    );
  }
});
