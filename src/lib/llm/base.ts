import { ToolDefinition, LLMResponse } from '@/types';

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: { name: string; arguments: Record<string, unknown> }[];
}

export abstract class LLMProvider {
  abstract chat(
    messages: ConversationMessage[],
    tools?: ToolDefinition[]
  ): Promise<LLMResponse>;

  abstract get name(): string;
}
