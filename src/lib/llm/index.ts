import { LLMProvider } from './base';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { ClaudeProvider } from './providers/claude';

export type ProviderName = 'gemini' | 'openai' | 'claude';

const providers: Record<ProviderName, { keyEnv: string; modelEnv: string; factory: (key: string, model?: string) => LLMProvider }> = {
  gemini: {
    keyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    factory: (key, model) => new GeminiProvider(key, model),
  },
  openai: {
    keyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    factory: (key, model) => new OpenAIProvider(key, model),
  },
  claude: {
    keyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'ANTHROPIC_MODEL',
    factory: (key, model) => new ClaudeProvider(key, model),
  },
};

let cachedProvider: LLMProvider | null = null;
let cachedProviderName: string | null = null;

export function getLLMProvider(): LLMProvider {
  const providerName = (process.env.LLM_PROVIDER || 'gemini') as ProviderName;

  // Return cached if same provider
  if (cachedProvider && cachedProviderName === providerName) {
    return cachedProvider;
  }

  const config = providers[providerName];
  if (!config) {
    throw new Error(`Provider LLM inconnu: ${providerName}. Choix: ${Object.keys(providers).join(', ')}`);
  }

  const apiKey = process.env[config.keyEnv];
  if (!apiKey || apiKey.startsWith('your_')) {
    throw new Error(`Clé API manquante: ${config.keyEnv}. Configurez-la dans .env.local`);
  }

  const model = process.env[config.modelEnv];
  cachedProvider = config.factory(apiKey, model);
  cachedProviderName = providerName;

  console.log(`[LLM] Provider actif: ${providerName}${model ? ` (${model})` : ''}`);
  return cachedProvider;
}

export { LLMProvider } from './base';
export type { ConversationMessage } from './base';
