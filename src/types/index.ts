// === Types globaux pour Nadia AI ===

// Messages du chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: ResponseData;
}

// Données structurées renvoyées par le middleware
export interface ResponseData {
  type: 'tableau' | 'graphique' | 'texte';
  donnees?: Record<string, unknown>[];
  colonnes?: string[];
  graphique_type?: 'bar' | 'line' | 'pie';
}

// Réponse du middleware vers le frontend
export interface MiddlewareResponse {
  texte: string;
  type_donnees?: 'tableau' | 'graphique' | 'texte';
  donnees?: Record<string, unknown>[];
}

// Configuration LLM
export interface LLMConfig {
  provider: 'gemini' | 'openai' | 'claude';
  apiKey: string;
  model?: string;
}

// Tool/Function calling — format unifié
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  text?: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'error';
}
