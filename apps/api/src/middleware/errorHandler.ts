import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
  stack?: string;
}

/**
 * Global error handler for the API
 */
export function errorHandler(err: Error, c: Context): Response {
  console.error('Error:', err);

  // Handle HTTP exceptions
  if (err instanceof HTTPException) {
    const response: ErrorResponse = {
      error: getErrorName(err.status),
      message: err.message,
      statusCode: err.status,
    };

    if (err.cause) {
      response.details = err.cause;
    }

    return c.json(response, err.status);
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: 'Validation Error',
      message: 'Request validation failed',
      statusCode: 400,
      details: formatZodErrors(err),
    };

    return c.json(response, 400);
  }

  // Handle database errors
  if (isDatabaseError(err)) {
    const response: ErrorResponse = {
      error: 'Database Error',
      message: 'A database error occurred',
      statusCode: 500,
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = err.message;
    }

    return c.json(response, 500);
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };

  if (process.env.NODE_ENV === 'development') {
    response.message = err.message;
    response.stack = err.stack;
  }

  return c.json(response, 500);
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(error: ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return errors;
}

/**
 * Check if error is a database error
 */
function isDatabaseError(err: Error): boolean {
  return (
    err.name === 'PostgresError' ||
    err.message.includes('database') ||
    err.message.includes('connection')
  );
}

/**
 * Get error name from HTTP status code
 */
function getErrorName(status: number): string {
  const errorNames: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return errorNames[status] || 'Error';
}

/**
 * Custom API error class
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Create a not found error
 */
export function notFound(resource: string): HTTPException {
  return new HTTPException(404, {
    message: `${resource} not found`,
  });
}

/**
 * Create a conflict error
 */
export function conflict(message: string): HTTPException {
  return new HTTPException(409, {
    message,
  });
}

/**
 * Create a forbidden error
 */
export function forbidden(message: string = 'Access denied'): HTTPException {
  return new HTTPException(403, {
    message,
  });
}

/**
 * Create a bad request error
 */
export function badRequest(message: string, details?: unknown): HTTPException {
  return new HTTPException(400, {
    message,
    cause: details,
  });
}
