/**
 * 从错误对象中提取错误消息
 * @param error 错误对象
 * @param defaultMessage 默认错误消息
 * @returns 错误消息字符串
 */
export function getErrorMessage(
  error: unknown,
  defaultMessage: string = '操作失败，请重试'
): string {
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    return axiosError.response?.data?.error || defaultMessage;
  }
  
  return defaultMessage;
}

/**
 * 从错误对象中提取 Axios 错误详情
 * @param error 错误对象
 * @returns 错误详情对象
 */
export function getErrorDetails(error: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  
  if (error instanceof Error) {
    details.message = error.message;
    details.stack = error.stack;
  }
  
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as {
      response?: { data?: unknown; status?: number; statusText?: string };
      config?: unknown;
    };
    details.response = axiosError.response?.data;
    details.status = axiosError.response?.status;
    details.statusText = axiosError.response?.statusText;
    details.config = axiosError.config;
  }
  
  return details;
}
