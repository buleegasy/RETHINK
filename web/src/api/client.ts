const API_BASE = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * 通用的 fetch 包装器，处理鉴权和错误拦截
 */
export async function apiClient<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = true, headers, ...customOptions } = options;
  
  const token = localStorage.getItem('rethink_auth_token');
  
  if (requireAuth && !token) {
    throw new ApiError(401, '未登录或登录已过期');
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requireAuth && token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    ...customOptions,
  });

  if (!response.ok) {
    if (response.status === 401) {
      // 统一处理未授权错误：清除 token 并抛出错误
      // 具体的跳转或状态清理交由顶层（如 useAuthStore）的订阅者或直接调用 store 处理
      localStorage.removeItem('rethink_auth_token');
      localStorage.removeItem('rethink_auth_user');
      // 由于这是底层的 utils，最优雅的做法是触发一个全局事件或者直接调用 authStore，
      // 为了解耦，这里只负责清理 localStorage 并抛出异常。
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMessage = errData.error;
      }
    } catch {
      // ignore JSON parse error
    }
    
    throw new ApiError(response.status, errorMessage);
  }

  // 对于空响应，不需要解析 JSON
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
