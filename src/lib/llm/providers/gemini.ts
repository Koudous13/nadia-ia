import { GoogleGenerativeAI, type Content, type Part, type FunctionDeclarationSchema } from '@google/generative-ai';
import { LLMProvider, ConversationMessage } from '../base';
import { ToolDefinition, LLMResponse } from '@/types';

export class GeminiProvider extends LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.0-flash') {
    super();
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  get name() {
    return 'gemini';
  }

  async chat(messages: ConversationMessage[], tools?: ToolDefinition[]): Promise<LLMResponse> {
    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const genModel = this.client.getGenerativeModel({
      model: this.model,
      ...(systemInstruction && { systemInstruction }),
    });

    const contents = this.convertMessages(conversationMessages);

    const geminiTools = tools?.length ? [{
      functionDeclarations: tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters as unknown as FunctionDeclarationSchema,
      })),
    }] : undefined;

    const result = await genModel.generateContent({
      contents,
      ...(geminiTools && { tools: geminiTools }),
    });

    const response = result.response;
    const candidate = response.candidates?.[0];

    if (!candidate) {
      return { text: 'Pas de réponse générée.', finishReason: 'error' };
    }

    const toolCalls = candidate.content.parts
      .filter(p => p.functionCall)
      .map(p => ({
        name: p.functionCall!.name,
        arguments: (p.functionCall!.args ?? {}) as Record<string, unknown>,
      }));

    if (toolCalls.length > 0) {
      return { toolCalls, finishReason: 'tool_calls' };
    }

    const text = candidate.content.parts
      .filter(p => p.text)
      .map(p => p.text)
      .join('');

    return { text, finishReason: 'stop' };
  }

  private convertMessages(messages: ConversationMessage[]): Content[] {
    const contents: Content[] = [];

    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const parts: Part[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'function',
          parts: [{ functionResponse: { name: msg.toolCallId ?? 'unknown', response: JSON.parse(msg.content) } }],
        });
      } else {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      }
    }

    return contents;
  }
}
