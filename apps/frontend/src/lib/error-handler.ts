import type { AxiosError } from 'axios';

/**
 * Centralized error handler for API errors
 * Maps status codes to user-friendly messages
 */
export function handleApiError(error: AxiosError): string {
  const status = error.response?.status;
  const responseData = error.response?.data as
    | { error?: { message?: string }; message?: string }
    | undefined;
  const message = responseData?.error?.message || responseData?.message || '';

  // Map status codes to user-friendly messages
  switch (status) {
    case 400:
      return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại';
    case 401:
      return 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại';
    case 403:
      return 'Bạn không có quyền thực hiện hành động này';
    case 404:
      return 'Không tìm thấy dữ liệu';
    case 409:
      return 'Xung đột dữ liệu, vui lòng thử lại';
    case 422:
      return 'Dữ liệu không hợp lệ, vui lòng kiểm tra lại';
    case 500:
      return 'Lỗi hệ thống, vui lòng thử lại sau';
    case 503:
      return 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau';
    default:
      // If there's a specific message from the server, use it
      if (message) {
        return message;
      }
      // Network error
      if (!error.response) {
        return 'Không thể kết nối đến máy chủ, vui lòng thử lại';
      }
      return 'Đã xảy ra lỗi, vui lòng thử lại';
  }
}

/**
 * Extract error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Đã xảy ra lỗi không xác định';
}
