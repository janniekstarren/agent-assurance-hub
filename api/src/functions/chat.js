import { app } from '@azure/functions';

/**
 * POST /api/chat  —  live NLP assistant proxy (Module 8: Ask).
 *
 * DORMANT BY DEFAULT. The browser never holds an Azure OpenAI key; this
 * server-side function is the production path. It stays disabled until the
 * Static Web App has the AZURE_OPENAI_* application settings configured, at
 * which point the front-end's AzureOpenAIChatProvider can target it. Until
 * then the app runs entirely on MockChatProvider and this endpoint returns
 * 501 so the client transparently falls back.
 *
 * Production behaviour (when wired): Azure OpenAI / Azure AI Foundry
 * function-calling, where each tool maps to a real telemetry query — Power
 * Platform Inventory API, Log Analytics KQL, Dataverse OData, Azure Cost
 * Management. The tool JSON schemas the model is given are the same ones the
 * front-end documents in src/services/chat/tools.ts, so the mock and live
 * paths share one contract. Structured tool-calling over relational telemetry
 * is preferred to vector RAG here because the data is relational, not prose.
 */
app.http('chat', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !apiKey || !deployment) {
      return {
        status: 501,
        jsonBody: {
          error: 'live-chat-disabled',
          message:
            'Live Azure OpenAI chat is not configured. The app is using ' +
            'MockChatProvider. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY ' +
            'and AZURE_OPENAI_DEPLOYMENT in the Static Web App application ' +
            'settings, and set api_location: "api" in the deploy workflow, to ' +
            'enable this path.',
        },
      };
    }

    // --- Live path (scaffolded) ------------------------------------------
    // Wire the Azure OpenAI call with the tool schemas here. Kept intentionally
    // minimal so the demo ships without a live dependency.
    const body = await request.json().catch(() => ({}));
    context.log('chat request received', {
      messageCount: Array.isArray(body?.messages) ? body.messages.length : 0,
      deployment,
    });

    return {
      status: 200,
      jsonBody: {
        message:
          'Live chat endpoint reached. The reference implementation is left as ' +
          'a scaffold in this demo — wire the Azure OpenAI function-calling loop ' +
          'here using the shared tool schemas.',
      },
    };
  },
});
