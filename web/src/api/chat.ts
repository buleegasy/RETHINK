import { ApiError } from './client';
import type { UserProfile } from '../types';

export const chatApi = {
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
    sandplayState?: unknown;
  }) => {
    // 离线检测
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ApiError(0, '当前处于离线状态，请检查网络连接后重试');
    }

    const API_BASE = import.meta.env.VITE_API_URL || '';
    let token: string | null = null;
    try {
      token = localStorage.getItem('rethink_auth_token');
    } catch {
      // Storage unavailable
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}/api/chat`.replace(/\/api\/api\//g, '/api/');

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          stream: true,
        }),
      });
    } catch (fetchErr) {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new ApiError(0, '网络连接断开，当前处于离线状态');
      }
      throw new ApiError(0, fetchErr instanceof Error ? fetchErr.message : '网络请求失败，请检查网络连接');
    }

    if (!response.ok) {
      if (response.status === 401) {
        try {
          localStorage.removeItem('rethink_auth_token');
          localStorage.removeItem('rethink_auth_user');
        } catch {
          // Storage restricted
        }
        window.dispatchEvent(new Event('auth:unauthorized'));
        throw new ApiError(401, '登录凭证已过期，请重新登录');
      }
      let errorDetail = `API Error: ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson.error === 'string' && errJson.error) {
          errorDetail = errJson.error;
        }
      } catch {
        // Fallback if response body is non-JSON (e.g. 502/503 HTML)
      }
      throw new ApiError(response.status, errorDetail);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }

    return response.body;
  }
};
