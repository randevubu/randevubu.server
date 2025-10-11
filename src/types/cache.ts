// Import and re-export from unified request types
import { CachedRequest, CacheRequest, CacheResponse } from './request';
export { CachedRequest, CacheRequest, CacheResponse };

// Cache configuration
export interface CacheConfig {
  ttl?: number;
  keyPrefix?: string;
  skipCache?: (req: CachedRequest) => boolean;
  keyGenerator?: (req: CachedRequest) => string;
}

// Cache statistics
export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: string;
  connected: boolean;
}



