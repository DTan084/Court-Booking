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
      return 'Invalid input data, please check again';
    case 401:
      return 'Session expired, please sign in again';
    case 403:
      return 'You do not have permission to perform this action';
    case 404:
      return 'Data not found';
    case 409:
      return 'Data conflict occurred, please try again';
    case 422:
      return 'Invalid input data, please check again';
    case 500:
      return 'Internal server error, please try again later';
    case 503:
      return 'Service temporarily unavailable, please try again later';
    default:
      // If there's a specific message from the server, use it
      if (message) {
        return message;
      }
      // Network error
      if (!error.response) {
        return 'Cannot connect to server, please try again';
      }
      return 'An error occurred, please try again';
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
  return 'An unknown error occurred';
}
