// Global Express Request augmentation for timing
declare namespace Express {
  interface Request {
    startTime: number;
  }
}