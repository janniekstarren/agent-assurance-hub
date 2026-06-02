/**
 * AzureOpenAIChatProvider — the production path, DISABLED by default.
 *
 * Shows the real pattern: the browser POSTs to the SWA managed function
 * /api/chat, which proxies Azure OpenAI / Azure AI Foundry with the CHAT_TOOLS
 * function schemas. Each tool call maps to a real telemetry query (Inventory
 * API, Log Analytics KQL, Dataverse OData, Cost Management). The key never
 * reaches the browser. Enable by setting VITE_CHAT_PROVIDER=azure and
 * configuring the function's AZURE_OPENAI_* app settings (see README).
 */

import type { ChatProvider, ChatResult } from './types';
import { CHAT_TOOLS } from './tools';

export class AzureOpenAIChatProvider implements ChatProvider {
  id = 'azure' as const;
  label = 'Azure OpenAI / Foundry (live)';
  enabled = import.meta.env.VITE_CHAT_PROVIDER === 'azure';

  async ask(question: string): Promise<ChatResult> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: question }],
        tools: CHAT_TOOLS,
      }),
    });
    if (!res.ok) {
      throw new Error(
        'Live Azure OpenAI chat is disabled. The app uses MockChatProvider. ' +
          'Configure the /api/chat function to enable it.',
      );
    }
    const data = (await res.json()) as { message?: string };
    return { answer: data.message ?? '', citations: [], toolsUsed: [] };
  }
}
