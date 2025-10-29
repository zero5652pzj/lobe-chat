import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { message } from '@/components/AntdStaticMethods';
import { fileService } from '@/services/file';
import { uploadService } from '@/services/upload';
import { getImageDimensions } from '@/utils/client/imageDimensions';

import { useFileStore as useStore } from '../../store';

vi.mock('zustand/traditional');

// Mock necessary modules
vi.mock('@/components/AntdStaticMethods', () => ({
  message: {
    info: vi.fn(),
  },
}));

vi.mock('@/utils/client/imageDimensions', () => ({
  getImageDimensions: vi.fn(),
}));

// Mock for sha256
vi.mock('js-sha256', () => ({
  sha256: vi.fn(() => 'mock-hash-value'),
}));

// Mock file-type module (dynamic import)
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));

// Mock File.arrayBuffer method
beforeAll(() => {
  Object.defineProperty(File.prototype, 'arrayBuffer', {
    configurable: true,
    value: function () {
      return Promise.resolve(new ArrayBuffer(8));
    },
    writable: true,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileUploadAction', () => {
  describe('uploadBase64FileWithProgress', () => {
    it('should upload base64 image and return result with dimensions', async () => {
      const { result } = renderHook(() => useStore());

      const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';
      const mockDimensions = { height: 100, width: 200 };
      const mockMetadata = {
        date: '12345',
        dirname: '/test',
        filename: 'test.png',
        path: '/test/test.png',
      };
      const mockUploadResult = {
        fileType: 'image/png',
        hash: 'mock-hash',
        metadata: mockMetadata,
        size: 1024,
      };
      const mockFileResponse = {
        id: 'file-id-123',
        url: 'https://example.com/test.png',
      };

      // Mock dependencies
      vi.mocked(getImageDimensions).mockResolvedValue(mockDimensions);
      vi.spyOn(uploadService, 'uploadBase64ToS3').mockResolvedValue(mockUploadResult);
      vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

      const uploadResult = await act(async () => {
        return await result.current.uploadBase64FileWithProgress(base64Data);
      });

      expect(getImageDimensions).toHaveBeenCalledWith(base64Data);
      expect(uploadService.uploadBase64ToS3).toHaveBeenCalledWith(base64Data);
      expect(fileService.createFile).toHaveBeenCalledWith({
        fileType: mockUploadResult.fileType,
        hash: mockUploadResult.hash,
        metadata: mockUploadResult.metadata,
        name: mockMetadata.filename,
        size: mockUploadResult.size,
        url: mockMetadata.path,
      });

      expect(uploadResult).toEqual({
        ...mockFileResponse,
        dimensions: mockDimensions,
        filename: mockMetadata.filename,
      });
    });

    it('should handle base64 upload without dimensions for non-image files', async () => {
      const { result } = renderHook(() => useStore());

      const base64Data = 'data:application/pdf;base64,JVBERi0xLjQK';
      const mockMetadata = {
        date: '12345',
        dirname: '/test',
        filename: 'test.pdf',
        path: '/test/test.pdf',
      };
      const mockUploadResult = {
        fileType: 'application/pdf',
        hash: 'mock-hash',
        metadata: mockMetadata,
        size: 2048,
      };
      const mockFileResponse = {
        id: 'file-id-456',
        url: 'https://example.com/test.pdf',
      };

      vi.mocked(getImageDimensions).mockResolvedValue(undefined);
      vi.spyOn(uploadService, 'uploadBase64ToS3').mockResolvedValue(mockUploadResult);
      vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

      const uploadResult = await act(async () => {
        return await result.current.uploadBase64FileWithProgress(base64Data);
      });

      expect(getImageDimensions).toHaveBeenCalledWith(base64Data);
      expect(uploadResult).toEqual({
        ...mockFileResponse,
        dimensions: undefined,
        filename: mockMetadata.filename,
      });
    });

    it('should handle errors during base64 upload', async () => {
      const { result } = renderHook(() => useStore());

      const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA';

      vi.mocked(getImageDimensions).mockResolvedValue(undefined);
      vi.spyOn(uploadService, 'uploadBase64ToS3').mockRejectedValue(new Error('Upload failed'));

      await expect(
        act(async () => {
          await result.current.uploadBase64FileWithProgress(base64Data);
        }),
      ).rejects.toThrow('Upload failed');
    });
  });

  describe('uploadWithProgress', () => {
    describe('file already exists (hash match)', () => {
      it('should skip upload when file exists and use existing metadata', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'test.png', { type: 'image/png' });
        const mockDimensions = { height: 100, width: 200 };
        const mockExistingMetadata = {
          date: '12345',
          dirname: '/test',
          filename: 'existing.png',
          path: '/test/existing.png',
        };
        const mockCheckResult = {
          isExist: true,
          metadata: mockExistingMetadata,
          url: 'https://example.com/existing.png',
        };
        const mockFileResponse = {
          id: 'file-id-789',
          url: 'https://example.com/existing.png',
        };
        const onStatusUpdate = vi.fn();

        vi.mocked(getImageDimensions).mockResolvedValue(mockDimensions);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);
        const uploadToS3Spy = vi.spyOn(uploadService, 'uploadFileToS3');

        const uploadResult = await act(async () => {
          return await result.current.uploadWithProgress({
            file: mockFile,
            onStatusUpdate,
          });
        });

        expect(fileService.checkFileHash).toHaveBeenCalledWith('mock-hash-value');
        expect(uploadToS3Spy).not.toHaveBeenCalled();
        expect(onStatusUpdate).toHaveBeenCalledWith({
          id: mockFile.name,
          type: 'updateFile',
          value: { status: 'processing', uploadState: { progress: 100, restTime: 0, speed: 0 } },
        });
        expect(fileService.createFile).toHaveBeenCalledWith(
          {
            fileType: mockFile.type,
            hash: 'mock-hash-value',
            metadata: mockExistingMetadata,
            name: mockFile.name,
            size: mockFile.size,
            url: mockExistingMetadata.path, // Uses metadata.path when available
          },
          undefined,
        );
        expect(uploadResult).toEqual({
          ...mockFileResponse,
          dimensions: mockDimensions,
          filename: mockFile.name,
        });
      });
    });

    describe('file does not exist (new upload)', () => {
      it('should upload new file successfully with progress callbacks', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'newfile.jpg', { type: 'image/jpeg' });
        const mockDimensions = { height: 150, width: 250 };
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'newfile.jpg',
          path: '/uploads/newfile.jpg',
        };
        const mockCheckResult = {
          isExist: false,
        };
        const mockUploadResult = {
          data: mockMetadata,
          success: true,
        };
        const mockFileResponse = {
          id: 'file-id-new',
          url: 'https://example.com/newfile.jpg',
        };
        const onStatusUpdate = vi.fn();

        vi.mocked(getImageDimensions).mockResolvedValue(mockDimensions);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        const uploadResult = await act(async () => {
          return await result.current.uploadWithProgress({
            file: mockFile,
            onStatusUpdate,
          });
        });

        expect(fileService.checkFileHash).toHaveBeenCalledWith('mock-hash-value');
        expect(uploadService.uploadFileToS3).toHaveBeenCalledWith(mockFile, {
          onNotSupported: expect.any(Function),
          onProgress: expect.any(Function),
          skipCheckFileType: undefined,
        });
        expect(fileService.createFile).toHaveBeenCalledWith(
          {
            fileType: mockFile.type,
            hash: 'mock-hash-value',
            metadata: mockMetadata,
            name: mockFile.name,
            size: mockFile.size,
            url: mockMetadata.path,
          },
          undefined,
        );
        expect(onStatusUpdate).toHaveBeenCalledWith({
          id: mockFile.name,
          type: 'updateFile',
          value: {
            fileUrl: mockFileResponse.url,
            id: mockFileResponse.id,
            status: 'success',
            uploadState: { progress: 100, restTime: 0, speed: 0 },
          },
        });
        expect(uploadResult).toEqual({
          ...mockFileResponse,
          dimensions: mockDimensions,
          filename: mockFile.name,
        });
      });

      it('should call onProgress callback during upload', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'progress.png', { type: 'image/png' });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'progress.png',
          path: '/uploads/progress.png',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-progress', url: 'https://example.com/p.png' };
        const onStatusUpdate = vi.fn();

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);

        // Mock uploadFileToS3 to call onProgress
        vi.spyOn(uploadService, 'uploadFileToS3').mockImplementation(
          async (file, { onProgress }) => {
            onProgress?.('uploading', { progress: 50, restTime: 5, speed: 1024 });
            onProgress?.('success', { progress: 100, restTime: 0, speed: 2048 });
            return mockUploadResult;
          },
        );
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
            onStatusUpdate,
          });
        });

        expect(onStatusUpdate).toHaveBeenCalledWith({
          id: mockFile.name,
          type: 'updateFile',
          value: { status: 'uploading', uploadState: { progress: 50, restTime: 5, speed: 1024 } },
        });
        expect(onStatusUpdate).toHaveBeenCalledWith({
          id: mockFile.name,
          type: 'updateFile',
          value: { status: 'processing', uploadState: { progress: 100, restTime: 0, speed: 2048 } },
        });
      });

      it('should handle upload failure and return undefined', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'fail.png', { type: 'image/png' });
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: {} as any, success: false };
        const onStatusUpdate = vi.fn();

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        const createFileSpy = vi.spyOn(fileService, 'createFile');

        const uploadResult = await act(async () => {
          return await result.current.uploadWithProgress({
            file: mockFile,
            onStatusUpdate,
          });
        });

        expect(uploadResult).toBeUndefined();
        expect(createFileSpy).not.toHaveBeenCalled();
      });

      it('should call onNotSupported when file type is not supported', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'unsupported.xyz', {
          type: 'application/xyz',
        });
        const mockCheckResult = { isExist: false };
        const onStatusUpdate = vi.fn();

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);

        // Mock uploadFileToS3 to call onNotSupported
        vi.spyOn(uploadService, 'uploadFileToS3').mockImplementation(
          async (file, { onNotSupported }) => {
            onNotSupported?.();
            return { data: {} as any, success: false };
          },
        );

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
            onStatusUpdate,
          });
        });

        expect(onStatusUpdate).toHaveBeenCalledWith({
          id: mockFile.name,
          type: 'removeFile',
        });
        expect(message.info).toHaveBeenCalled();
      });
    });

    describe('file type detection', () => {
      it('should use file.type when available', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'typed.png', { type: 'image/png' });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'typed.png',
          path: '/uploads/typed.png',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-typed', url: 'https://example.com/typed.png' };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
          });
        });

        expect(fileService.createFile).toHaveBeenCalledWith(
          expect.objectContaining({
            fileType: 'image/png',
          }),
          undefined,
        );
      });

      it('should detect file type from buffer when file.type is empty', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'noType.png', { type: '' });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'noType.png',
          path: '/uploads/noType.png',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-notype', url: 'https://example.com/noType.png' };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        // Mock dynamic import of fileTypeFromBuffer
        const { fileTypeFromBuffer } = await import('file-type');
        vi.mocked(fileTypeFromBuffer).mockResolvedValue({ ext: 'png', mime: 'image/png' } as any);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
          });
        });

        expect(fileTypeFromBuffer).toHaveBeenCalled();
        expect(fileService.createFile).toHaveBeenCalledWith(
          expect.objectContaining({
            fileType: 'image/png',
          }),
          undefined,
        );
      });

      it('should default to text/plain when file type cannot be detected', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'unknown', { type: '' });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'unknown',
          path: '/uploads/unknown',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-unknown', url: 'https://example.com/unknown' };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        // Mock dynamic import to return undefined
        const { fileTypeFromBuffer } = await import('file-type');
        vi.mocked(fileTypeFromBuffer).mockResolvedValue(undefined);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
          });
        });

        expect(fileService.createFile).toHaveBeenCalledWith(
          expect.objectContaining({
            fileType: 'text/plain',
          }),
          undefined,
        );
      });
    });

    describe('knowledge base integration', () => {
      it('should pass knowledgeBaseId to createFile when provided', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'kb-file.txt', { type: 'text/plain' });
        const mockMetadata = {
          date: '12345',
          dirname: '/kb',
          filename: 'kb-file.txt',
          path: '/kb/kb-file.txt',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-kb', url: 'https://example.com/kb-file.txt' };
        const knowledgeBaseId = 'kb-123';

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
            knowledgeBaseId,
          });
        });

        expect(fileService.createFile).toHaveBeenCalledWith(
          expect.objectContaining({
            name: mockFile.name,
          }),
          knowledgeBaseId,
        );
      });
    });

    describe('skipCheckFileType option', () => {
      it('should pass skipCheckFileType to uploadFileToS3', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'skip.bin', {
          type: 'application/octet-stream',
        });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'skip.bin',
          path: '/uploads/skip.bin',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-skip', url: 'https://example.com/skip.bin' };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        await act(async () => {
          await result.current.uploadWithProgress({
            file: mockFile,
            skipCheckFileType: true,
          });
        });

        expect(uploadService.uploadFileToS3).toHaveBeenCalledWith(
          mockFile,
          expect.objectContaining({
            skipCheckFileType: true,
          }),
        );
      });
    });

    describe('image dimensions handling', () => {
      it('should extract dimensions for image files', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['image data'], 'image.jpg', { type: 'image/jpeg' });
        const mockDimensions = { height: 300, width: 400 };
        const mockMetadata = {
          date: '12345',
          dirname: '/images',
          filename: 'image.jpg',
          path: '/images/image.jpg',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-img', url: 'https://example.com/image.jpg' };

        vi.mocked(getImageDimensions).mockResolvedValue(mockDimensions);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        const uploadResult = await act(async () => {
          return await result.current.uploadWithProgress({
            file: mockFile,
          });
        });

        expect(getImageDimensions).toHaveBeenCalledWith(mockFile);
        expect(uploadResult?.dimensions).toEqual(mockDimensions);
      });

      it('should return undefined dimensions for non-image files', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['text data'], 'document.txt', { type: 'text/plain' });
        const mockMetadata = {
          date: '12345',
          dirname: '/docs',
          filename: 'document.txt',
          path: '/docs/document.txt',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };
        const mockFileResponse = { id: 'file-id-txt', url: 'https://example.com/document.txt' };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockResolvedValue(mockFileResponse);

        const uploadResult = await act(async () => {
          return await result.current.uploadWithProgress({
            file: mockFile,
          });
        });

        expect(uploadResult?.dimensions).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should handle checkFileHash errors', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'error.png', { type: 'image/png' });

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockRejectedValue(new Error('Hash check failed'));

        await expect(
          act(async () => {
            await result.current.uploadWithProgress({
              file: mockFile,
            });
          }),
        ).rejects.toThrow('Hash check failed');
      });

      it('should handle uploadFileToS3 errors', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'error.png', { type: 'image/png' });
        const mockCheckResult = { isExist: false };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockRejectedValue(new Error('Upload failed'));

        await expect(
          act(async () => {
            await result.current.uploadWithProgress({
              file: mockFile,
            });
          }),
        ).rejects.toThrow('Upload failed');
      });

      it('should handle createFile errors', async () => {
        const { result } = renderHook(() => useStore());

        const mockFile = new File(['test content'], 'error.png', { type: 'image/png' });
        const mockMetadata = {
          date: '12345',
          dirname: '/uploads',
          filename: 'error.png',
          path: '/uploads/error.png',
        };
        const mockCheckResult = { isExist: false };
        const mockUploadResult = { data: mockMetadata, success: true };

        vi.mocked(getImageDimensions).mockResolvedValue(undefined);
        vi.spyOn(fileService, 'checkFileHash').mockResolvedValue(mockCheckResult);
        vi.spyOn(uploadService, 'uploadFileToS3').mockResolvedValue(mockUploadResult);
        vi.spyOn(fileService, 'createFile').mockRejectedValue(new Error('DB creation failed'));

        await expect(
          act(async () => {
            await result.current.uploadWithProgress({
              file: mockFile,
            });
          }),
        ).rejects.toThrow('DB creation failed');
      });
    });
  });
});
