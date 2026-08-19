import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { apiClient, ApiError } from './client';

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should throw if requireAuth is true and no token', async () => {
    await expect(apiClient('/test')).rejects.toThrow(ApiError);
    await expect(apiClient('/test')).rejects.toThrow('未登录或登录已过期');
  });

  it('should attach token if requireAuth is true', async () => {
    localStorage.setItem('rethink_auth_token', 'my-token');
    
    const mockResponse = { ok: true, status: 200, headers: new Headers(), json: async () => ({ data: 'ok' }) };
    (global.fetch as Mock).mockResolvedValue(mockResponse);

    await apiClient('/test');
    
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        })
      })
    );
  });

  it('should not throw if requireAuth is false and no token', async () => {
    const mockResponse = { ok: true, status: 200, headers: new Headers(), json: async () => ({ data: 'ok' }) };
    (global.fetch as Mock).mockResolvedValue(mockResponse);

    const result = await apiClient('/test', { requireAuth: false });
    expect(result).toEqual({ data: 'ok' });
  });

  it('should throw ApiError when response is not ok', async () => {
    localStorage.setItem('rethink_auth_token', 'my-token');
    
    const mockResponse = { 
      ok: false, 
      status: 400,
      headers: new Headers(),
      json: async () => ({ error: 'Bad Request' }) 
    };
    (global.fetch as Mock).mockResolvedValue(mockResponse);

    try {
      await apiClient('/test');
      expect.fail('Should have thrown');
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(ApiError);
      if (e instanceof ApiError) {
        expect(e.status).toBe(400);
        expect(e.message).toBe('Bad Request');
      }
    }
  });

  it('should handle 401 and clear localStorage', async () => {
    localStorage.setItem('rethink_auth_token', 'my-token');
    localStorage.setItem('rethink_auth_user', 'some-user');
    
    const mockResponse = { 
      ok: false, 
      status: 401,
      headers: new Headers(),
      json: async () => ({ error: 'Unauthorized' }) 
    };
    (global.fetch as Mock).mockResolvedValue(mockResponse);

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

    try {
      await apiClient('/test');
    } catch {
      // Expected
    }

    expect(localStorage.getItem('rethink_auth_token')).toBeNull();
    expect(localStorage.getItem('rethink_auth_user')).toBeNull();
    expect(dispatchEventSpy).toHaveBeenCalled();
  });

  it('should return empty object for 204 response', async () => {
    const mockResponse = { 
      ok: true, 
      status: 204,
      headers: new Headers()
    };
    (global.fetch as Mock).mockResolvedValue(mockResponse);

    const result = await apiClient('/test', { requireAuth: false });
    expect(result).toEqual({});
  });
});
