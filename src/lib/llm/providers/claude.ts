import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, ConversationMessage } from '../base';
import { ToolDefinition, LLMResponse } from '@/types';

export class ClaudeProvider extends LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-sonnet-4-20250514') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  get name() {
    return 'claude';
  }

  async chat(messages: ConversationMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const systemMsg = messages.find(m => m.role === 'system')?.content;
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const anthropicMessages = conversationMessages.map(m => {
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [{
            type: 'tool_result' as const,
            tool_use_id: m.toolCallId ?? '',
            content: m.content,
          }],
        };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        const content: Anthropic.ContentBlock[] = [];
        if (m.content) content.push({ type: 'text', text: m.content } as Anthropic.TextBlock);
        for (const tc of m.toolCalls) {
          content.push({
            type: 'tool_use',
            id: `toolu_${tc.name}`,
            name: tc.name,
            input: tc.arguments,
          } as Anthropic.ToolUseBlock);
        }
        return { role: 'assistant' as const, content };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content };
    });

    const anthropicTools = tools?.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters as Anthropic.Tool['input_schema'],
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      ...(systemMsg && { system: systemMsg }),
      messages: anthropicMessages as Anthropic.MessageParam[],
      ...(anthropicTools?.length && { tools: anthropicTools }),
    });

    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (toolUseBlocks.length > 0) {
      return {
        toolCalls: toolUseBlocks.map(b => ({
          name: (b as Anthropic.ToolUseBlock).name,
          arguments: (b as Anthropic.ToolUseBlock).input as Record<string, unknown>,
        })),
        finishReason: 'tool_calls',
      };
    }

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('');

    return { text, finishReason: 'stop' };
  }
}
