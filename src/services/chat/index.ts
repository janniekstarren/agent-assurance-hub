/** Pluggable chat provider selection. MockChatProvider is the default; the
    AzureOpenAIChatProvider takes over only when VITE_CHAT_PROVIDER=azure. */

import { AzureOpenAIChatProvider } from './azureProvider';
import { MockChatProvider } from './mockProvider';
import type { ChatProvider } from './types';

let provider: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  if (provider) return provider;
  const azure = new AzureOpenAIChatProvider();
  provider = azure.enabled ? azure : new MockChatProvider();
  return provider;
}

export { SUGGESTED_PROMPTS } from './mockProvider';
export type {
  ChatMessage,
  ChatProvider,
  ChatResult,
  ChatTemplate,
  ChatTone,
} from './types';
