import { Response } from 'express';

/**
 * 统一错误处理工具
 */

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

/**
 * 创建 API 错误对象
 */
export function createApiError(
  message: string,
  statusCode: number = 500,
  code?: string
): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

/**
 * 处理并发送错误响应
 */
export function handleError(res: Response, error: unknown, defaultMessage: string = '内部服务器错误'): void {
  if (error instanceof Error) {
    const apiError = error as ApiError;
    const statusCode = apiError.statusCode || 500;
    const message = error.message || defaultMessage;
    
    console.error(`[${statusCode}] ${message}`, error);
    res.status(statusCode).json({ error: message });
  } else {
    console.error('未知错误:', error);
    res.status(500).json({ error: defaultMessage });
  }
}

/**
 * 异步控制器错误处理包装器
 */
export function asyncHandler(
  fn: (req: any, res: Response, next?: any) => Promise<any>
) {
  return (req: any, res: Response, next?: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleError(res, error);
    });
  };
}
