export interface CompletionRequest {
  system: string;
  prompt: string;
  maxTokens?: number;
}

/** Any model backend: hosted API or a local model inside the customer's network. */
export interface LLMProvider {
  readonly name: string;
  /** True when requests leave the customer's infrastructure. */
  readonly external: boolean;
  complete(req: CompletionRequest): Promise<string>;
}
