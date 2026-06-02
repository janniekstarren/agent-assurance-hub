/** Chat provider contract — shared by the offline mock provider and the
    (disabled) Azure OpenAI provider, so the UI is provider-agnostic. */

import type { Citation } from '../../types/domain';

export interface ChatResult {
  answer: string;
  citations: Citation[];
  /** Names of the tools (telemetry queries) the provider "called". */
  toolsUsed: string[];
}

export interface ChatProvider {
  id: 'mock' | 'azure';
  label: string;
  /** Whether this provider can actually answer (Azure is off by default). */
  enabled: boolean;
  ask(question: string): Promise<ChatResult>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  toolsUsed?: string[];
  /** True while the assistant text is still streaming in. */
  streaming?: boolean;
}
