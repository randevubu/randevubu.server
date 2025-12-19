/**
 * Consolidated OpenAPI Schemas
 *
 * This file contains all reusable schema definitions for the API.
 * Schemas are organized by domain for easy navigation.
 *
 * Note: These schemas are referenced in route @swagger comments
 * and are essential for API documentation.
 */

import { commonSchemas } from './common.schemas';

// Re-export common schemas
export { commonSchemas };

/**
 * Export all schemas as a single object
 * This will be imported by the main openapi.ts config
 */
export const allSchemas = {
  ...commonSchemas,
  // Additional schemas will be added here as we extract them
  // For now, they remain in openapi.ts
};
