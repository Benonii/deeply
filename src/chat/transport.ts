import { AssistantChatTransport } from '@assistant-ui/react-ai-sdk';

import { fetchConvexAuthToken } from '../lib/api';

const CHAT_API_PATH = '/api/chat';

async function readAuthHeaders(): Promise<Record<string, string>> {
  const token = await fetchConvexAuthToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function createChatTransport() {
  return new AssistantChatTransport({ api: CHAT_API_PATH, headers: readAuthHeaders });
}
