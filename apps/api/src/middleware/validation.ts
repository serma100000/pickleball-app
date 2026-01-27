import { zValidator } from '@hono/zod-validator';
import { z, type ZodSchema, ZodError } from 'zod';
import { HTTPException } from 'hono/http-exception';

/**
 * Validate request body with Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return zValidator('json', schema, (result, _c) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: 'Validation failed',
        cause: formatZodErrors(result.error),
      });
    }
  });
}

/**
 * Validate query parameters with Zod schema
 */
export function validateQuery<T extends ZodSchema>(schema: T) {
  return zValidator('query', schema, (result, _c) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: 'Invalid query parameters',
        cause: formatZodErrors(result.error),
      });
    }
  });
}

/**
 * Validate route parameters with Zod schema
 */
export function validateParams<T extends ZodSchema>(schema: T) {
  return zValidator('param', schema, (result, _c) => {
    if (!result.success) {
      throw new HTTPException(400, {
        message: 'Invalid path parameters',
        cause: formatZodErrors(result.error),
      });
    }
  });
}

/**
 * Format Zod errors into a user-friendly structure
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

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  ...paginationSchema.shape,
});

export const geoSearchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(100).default(25), // km
  ...paginationSchema.shape,
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and sanitize string fields in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>
      );
    }
  }

  return sanitized;
}
