import { existsSync } from 'node:fs';
import type { ProviderDriver } from '../driver-types.ts';
import type { ModelDefinition } from '../../../../config/models.ts';
import { getAllPiModels, getPiModelsForAuthProvider } from '../../../../config/models-pi.ts';

/**
 * Fetch models dynamically from the GitHub Copilot API using @github/copilot-sdk.
 * Requires a valid OAuth access token from the Copilot device flow.
 */
async function fetchCopilotModels(
  accessToken: string,
  copilotCliPath: string | undefined,
  timeoutMs: number,
): Promise<ModelDefinition[]> {
  const { CopilotClient } = await import('@github/copilot-sdk');

  const prevToken = process.env.COPILOT_GITHUB_TOKEN;
  process.env.COPILOT_GITHUB_TOKEN = accessToken;

  const client = new CopilotClient({
    useStdio: true,
    autoStart: true,
    logLevel: 'debug',
    ...(copilotCliPath && existsSync(copilotCliPath) ? { cliPath: copilotCliPath } : {}),
  });

  const restoreEnv = () => {
    if (prevToken !== undefined) {
      process.env.COPILOT_GITHUB_TOKEN = prevToken;
    } else {
      delete process.env.COPILOT_GITHUB_TOKEN;
    }
  };

  let models: Array<{ id: string; name: string; supportedReasoningEfforts?: string[]; policy?: { state: string } }>;
  try {
    await Promise.race([
      client.start(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(
        'Copilot client failed to start within timeout. Check your network connection and GitHub Copilot subscription.',
      )), timeoutMs)),
    ]);

    models = await Promise.race([
      client.listModels(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(
        'Copilot model listing timed out. Your GitHub token may be invalid or expired.',
      )), timeoutMs)),
    ]);
  } catch (error) {
    restoreEnv();
    try { await client.stop(); } catch { /* ignore cleanup errors */ }
    throw error;
  }

  try { await client.stop(); } catch { /* ignore cleanup errors */ }
  restoreEnv();

  if (!models || models.length === 0) {
    throw new Error('No models returned from Copilot API.');
  }

  // Only include models the user has enabled in their Copilot settings.
  // Models without policy info are kept (API may not always report policy).
  const enabledModels = models.filter(m => !m.policy || m.policy.state === 'enabled');

  if (enabledModels.length === 0) {
    throw new Error('No enabled models found. Enable models in your GitHub Copilot settings.');
  }

  return enabledModels.map(m => ({
    id: m.id,
    name: m.name,
    shortName: m.name,
    description: '',
    provider: 'pi' as const,
    contextWindow: 200_000,
    supportsThinking: !!(m.supportedReasoningEfforts && m.supportedReasoningEfforts.length > 0),
  }));
}

/**
 * Internal helper to get a proxy-aware fetch function if running in Electron main process.
 */
function getFetchFn(): typeof fetch {
  try {
    // In the Electron main process, `net.fetch` hooks into the Chromium networking stack,
    // which properly respects the system proxy and app proxy overrides.
    const electron = require('electron');
    if (electron && electron.net && electron.net.fetch) {
      return electron.net.fetch as typeof fetch;
    }
  } catch {
    // Fallback to global fetch if electron is not available (e.g. CLI or tests)
  }
  return globalThis.fetch;
}

/**
 * Internal helper to probe an LLM endpoint with a lightweight API call.
 * Uses a minimal messages request instead of /v1/models because many
 * third-party endpoints (especially Cloudflare-protected ones) block
 * the /v1/models endpoint with WAF challenges.
 */
async function probeConnection(args: {
  apiKey: string;
  baseUrl?: string;
  timeoutMs: number;
}): Promise<{ success: boolean; error?: string }> {
  const { apiKey, baseUrl, timeoutMs } = args;
  const effectiveBase = (baseUrl ?? '').trim() || 'https://api.pi-ai.workers.dev';
  const cleanBase = effectiveBase.replace(/\/+$/, '');

  // Use /v1/messages endpoint with a minimal test request
  const probeUrl = cleanBase.endsWith('/v1') ? `${cleanBase}/messages` : `${cleanBase}/v1/messages`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const fetchFn = getFetchFn();

  try {
    // Send a minimal messages request to test auth
    const resp = await fetchFn(probeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // 401/403 with auth error -> bad API key
    if (resp.status === 401) {
      return { success: false, error: '无效的 API 密钥或未授权。请检查您的 API 密钥。' };
    }

    // 403 could be Cloudflare challenge OR auth error - check response body
    if (resp.status === 403) {
      const body = await resp.text();
      // Cloudflare challenge pages contain HTML
      if (body.includes('Just a moment') || body.includes('challenge-platform') || body.includes('cf-')) {
        // Cloudflare challenge - endpoint is reachable, try to proceed
        return { success: true };
      }
      return { success: false, error: '无效的 API 密钥或未授权。请检查您的 API 密钥。' };
    }

    // 2xx, 4xx (except 401/403), 5xx -> endpoint is reachable
    // 404 means wrong endpoint path, but server responded
    // 400/422 means request format issue, but auth worked
    return { success: true };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('AbortError')) {
      return { success: false, error: `连接测试超时。请检查 ${effectiveBase} 是否可访问，或检查代理设置。` };
    }
    return { success: false, error: `无法连接到 ${effectiveBase}: ${msg}` };
  }
}

export const piDriver: ProviderDriver = {
  provider: 'pi',
  buildRuntime: ({ context, providerOptions, resolvedPaths }) => ({
    paths: {
      piServer: resolvedPaths.piServerPath,
      interceptor: resolvedPaths.interceptorBundlePath,
      node: resolvedPaths.nodeRuntimePath,
    },
    piAuthProvider: providerOptions?.piAuthProvider || context.connection?.piAuthProvider,
  }),
  /**
   * Test the Pi connection with a lightweight HTTP request rather than
   * spawning the full Pi subprocess (which requires the sidecar and takes ~20s to init).
   */
  testConnection: async ({ apiKey, baseUrl, timeoutMs }) => {
    return probeConnection({
      apiKey,
      baseUrl,
      timeoutMs: timeoutMs ?? 20000,
    });
  },
  fetchModels: async ({ connection, credentials, resolvedPaths, timeoutMs }) => {
    // Copilot OAuth: fetch models dynamically from the Copilot API
    if (connection.piAuthProvider === 'github-copilot' && credentials.oauthAccessToken) {
      const models = await fetchCopilotModels(
        credentials.oauthAccessToken,
        resolvedPaths.copilotCliPath,
        timeoutMs,
      );
      return { models };
    }

    // Custom endpoint: do not overwrite user-defined models with static lists
    if (connection.baseUrl) {
      const existingModels = connection.models || [];
      return {
        models: existingModels.map((m) =>
          typeof m === 'string'
            ? {
              id: m,
              name: m,
              shortName: m,
              description: 'Custom model',
              provider: 'pi',
              contextWindow: 128000,
            }
            : m
        ),
      };
    }

    // All other Pi providers: use static Pi SDK model registry
    const models = connection.piAuthProvider
      ? getPiModelsForAuthProvider(connection.piAuthProvider)
      : getAllPiModels();

    if (models.length === 0) {
      throw new Error(
        `No Pi models found for provider: ${connection.piAuthProvider ?? 'all'}`,
      );
    }

    return { models };
  },
  validateStoredConnection: async ({ connection, credentialManager }) => {
    // For API key connections, we can perform a lightweight reachability check
    if (connection.authType === 'api_key' || connection.authType === 'api_key_with_endpoint') {
      const apiKey = await credentialManager.getLlmApiKey(connection.slug);
      if (!apiKey) return { success: false, error: '未找到 API 密钥' };

      return probeConnection({
        apiKey,
        baseUrl: connection.baseUrl,
        timeoutMs: 10000, // Shorter timeout for background validation
      });
    }

    // OAuth connections (Copilot, etc.) are validated by checking if we have tokens.
    // Refreshing then happens on-demand during session start.
    return { success: true };
  },
};

