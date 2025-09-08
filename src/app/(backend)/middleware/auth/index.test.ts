import { AgentRuntimeError } from '@lobechat/model-runtime';
import { ChatErrorType } from '@lobechat/types';
import { getXorPayload } from '@lobechat/utils/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createErrorResponse } from '@/utils/errorResponse';

import { RequestHandler, checkAuth } from './index';
import { checkAuthMethod } from './utils';

vi.mock('@clerk/nextjs/server', () => ({
  getAuth: vi.fn(),
}));

vi.mock('@/utils/errorResponse', () => ({
  createErrorResponse: vi.fn(),
}));

vi.mock('./utils', () => ({
  checkAuthMethod: vi.fn(),
}));

vi.mock('@lobechat/utils/server', () => ({
  getXorPayload: vi.fn(),
}));

describe('checkAuth', () => {
  const mockHandler: RequestHandler = vi.fn();
  const mockRequest = new Request('https://example.com');
  const mockOptions = { params: Promise.resolve({ provider: 'mock' }) };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should return unauthorized error if no authorization header', async () => {
    await checkAuth(mockHandler)(mockRequest, mockOptions);

    expect(createErrorResponse).toHaveBeenCalledWith(ChatErrorType.Unauthorized, {
      error: AgentRuntimeError.createError(ChatErrorType.Unauthorized),
      provider: 'mock',
    });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should return error response on getJWTPayload error', async () => {
    const mockError = AgentRuntimeError.createError(ChatErrorType.Unauthorized);
    mockRequest.headers.set('Authorization', 'invalid');
    vi.mocked(getXorPayload).mockRejectedValueOnce(mockError);

    await checkAuth(mockHandler)(mockRequest, mockOptions);

    expect(createErrorResponse).toHaveBeenCalledWith(ChatErrorType.Unauthorized, {
      error: mockError,
      provider: 'mock',
    });
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('should return error response on checkAuthMethod error', async () => {
    const mockError = AgentRuntimeError.createError(ChatErrorType.Unauthorized);
    mockRequest.headers.set('Authorization', 'valid');
    vi.mocked(getXorPayload).mockResolvedValueOnce({});
    vi.mocked(checkAuthMethod).mockImplementationOnce(() => {
      throw mockError;
    });

    await checkAuth(mockHandler)(mockRequest, mockOptions);

    expect(createErrorResponse).toHaveBeenCalledWith(ChatErrorType.Unauthorized, {
      error: mockError,
      provider: 'mock',
    });
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
