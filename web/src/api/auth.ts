import { apiClient } from './client';
import type { ChatSessionSummary, ChatSessionDetail } from '../types';

export const authApi = {
  /**
   * 获取用户的全部历史会话摘要列表
   */
  getSessions: () => 
    apiClient<{ sessions?: ChatSessionSummary[] }>('/api/auth/sessions'),

  /**
   * 加载指定会话的详细信息（包含历史消息）
   * @param id 会话 ID
   */
  getSessionDetail: (id: string) => 
    apiClient<{ session?: ChatSessionDetail }>(`/api/auth/sessions/${encodeURIComponent(id)}`),
};
