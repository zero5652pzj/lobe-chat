import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useElectronStore } from '@/store/electron';
import { useUserStore } from '@/store/user';

import { useUserAvatar } from './useUserAvatar';

vi.mock('zustand/traditional');

// Mock @lobechat/const
let mockIsDesktop = false;

vi.mock('@lobechat/const', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lobechat/const')>();
  return {
    ...actual,
    get isDesktop() {
      return mockIsDesktop;
    },
    DEFAULT_USER_AVATAR: 'default-avatar.png',
  };
});

describe('useUserAvatar', () => {
  it('should return default avatar when user has no avatar', () => {
    act(() => {
      useUserStore.setState({ user: { avatar: undefined } as any });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe('default-avatar.png');
  });

  it('should return user avatar when available', () => {
    const mockAvatar = 'https://example.com/avatar.png';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe(mockAvatar);
  });

  it('should return original avatar in non-desktop environment', () => {
    mockIsDesktop = false;
    const mockAvatar = '/api/avatar.png';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
      useElectronStore.setState({
        dataSyncConfig: { remoteServerUrl: 'https://server.com', storageMode: 'cloud' },
      });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe(mockAvatar);
  });

  it('should return original avatar when no remote server URL in desktop environment', () => {
    mockIsDesktop = true;
    const mockAvatar = '/api/avatar.png';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
      useElectronStore.setState({
        dataSyncConfig: { remoteServerUrl: undefined, storageMode: 'local' },
      });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe(mockAvatar);
  });

  it('should prepend remote server URL when avatar starts with / in desktop environment', () => {
    mockIsDesktop = true;
    const mockAvatar = '/api/avatar.png';
    const mockServerUrl = 'https://server.com';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
      useElectronStore.setState({
        dataSyncConfig: { remoteServerUrl: mockServerUrl, storageMode: 'cloud' },
      });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe('https://server.com/api/avatar.png');
  });

  it('should not prepend remote server URL when avatar does not start with / in desktop environment', () => {
    mockIsDesktop = true;
    const mockAvatar = 'https://example.com/avatar.png';
    const mockServerUrl = 'https://server.com';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
      useElectronStore.setState({
        dataSyncConfig: { remoteServerUrl: mockServerUrl, storageMode: 'cloud' },
      });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe(mockAvatar);
  });

  it('should handle empty remote server URL in desktop environment', () => {
    mockIsDesktop = true;
    const mockAvatar = '/api/avatar.png';

    act(() => {
      useUserStore.setState({ user: { avatar: mockAvatar } as any });
      useElectronStore.setState({
        dataSyncConfig: { remoteServerUrl: '', storageMode: 'cloud' },
      });
    });

    const { result } = renderHook(() => useUserAvatar());

    expect(result.current).toBe(mockAvatar);
  });
});
