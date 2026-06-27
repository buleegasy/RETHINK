import { ApiError, apiClient } from './client';
import type { UserProfile } from '../types';

export const chatApi = {
  deleteMessage: (sessionId: string, messageId: string) => {
    return apiClient<void>(`/api/chat/sessions/${sessionId}/messages/${messageId}`, {
      method: 'DELETE',
    });
  },
  /**
   * 建立 SSE 连接发送对话
   * 由于需要流式处理，直接封装原生的 fetch 调用
   */
  sendMessageStream: async (payload: {
    messages: { role: string; content: string }[];
    sessionId?: string;
    profile?: UserProfile;
    model: string;
    facialEmotion?: { label: string; labelZh: string; confidence: number };
  }) => {
    const API_BASE = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('rethink_auth_token');
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/api/chat`.replace(/\/api\/api\//g, '/api/');

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('rethink_auth_token');
        localStorage.removeItem('rethink_auth_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new ApiError(401, '登录凭证已过期，请重新登录');
      }
      throw new ApiError(response.status, `API Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }

    return response.body;
  }
};
