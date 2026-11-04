import Anthropic from "@anthropic-ai/sdk";
import type { CompletionRequest, LLMProvider } from "./types.js";

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly external = true;
  private client: Anthropic;

  constructor(private opts: AnthropicProviderOptions = {}) {
    // Without an explicit key the SDK resolves credentials from the environment.
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
  }

  async complete(req: CompletionRequest): Promise<string> {
    const params = {
      model: this.opts.model ?? "claude-opus-5-5",
      max_tokens: req.maxTokens ?? 16000,
      system: req.system,
      messages: [{ role: "user" as const, content: req.prompt }],
      output_config: { effort: this.opts.effort ?? "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      // Re-run a declined request on Anthropic's recommended fallback model.
      fallbacks: "default",
    };
    const res = await this.client.beta.messages.create(
      params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming,
    );
    if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
    return res.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
  }
}
