import type { CompletionRequest, LLMProvider } from "./types.js";

/** Local models through Ollama. Nothing leaves the customer's network. */
export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  readonly external = false;

  constructor(private opts: { baseUrl?: string; model: string }) {}

  async complete(req: CompletionRequest): Promise<string> {
    const res = await fetch(`${this.opts.baseUrl ?? "http://localhost:11434"}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.opts.model,
        stream: false,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return (data.message?.content ?? "").trim();
  }
}
