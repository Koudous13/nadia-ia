import OpenAI from 'openai';
import { LLMProvider, ConversationMessage } from '../base';
import { ToolDefinition, LLMResponse } from '@/types';

export class OpenAIProvider extends LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  get name() {
    return 'openai';
  }

  async chat(messages: ConversationMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const openaiMessages = messages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'tool' as const,
          content: m.content,
          tool_call_id: m.toolCallId ?? '',
        };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc, i) => ({
            id: `call_${i}`,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          })),
        };
      }
      return { role: m.role, content: m.content };
    });

    const openaiTools = tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages as OpenAI.ChatCompletionMessageParam[],
      ...(openaiTools?.length && { tools: openaiTools }),
    });

    const choice = response.choices[0];
    if (!choice) {
      return { text: 'Pas de réponse générée.', finishReason: 'error' };
    }

    if (choice.message.tool_calls?.length) {
      return {
        toolCalls: choice.message.tool_calls
          .filter((tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: 'function' } => tc.type === 'function')
          .map(tc => ({
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          })),
        finishReason: 'tool_calls',
      };
    }

    return { text: choice.message.content ?? '', finishReason: 'stop' };
  }
}
