/** Chat provider contract — shared by the offline mock provider and the
    (disabled) Azure OpenAI provider, so the UI is provider-agnostic. */

import type { Citation } from '../../types/domain';

export type ChatTone = 'good' | 'bad' | 'warn' | 'neutral';

export interface ChatMetric {
  label: string;
  value: string;
  tone?: ChatTone;
}

export interface ChatListItem {
  title: string;
  detail: string;
  badge?: string;
  tone?: ChatTone;
}

/** A structured response template the assistant renders below its prose answer. */
export type ChatTemplate =
  | { kind: 'metrics'; title?: string; metrics: ChatMetric[] }
  | { kind: 'list'; title?: string; items: ChatListItem[] };

export interface ChatResult {
  answer: string;
  citations: Citation[];
  /** Names of the tools (telemetry queries) the provider "called". */
  toolsUsed: string[];
  /** Optional structured card rendered with the answer. */
  template?: ChatTemplate;
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
  template?: ChatTemplate;
  /** True while the assistant text is still streaming in. */
  streaming?: boolean;
}
