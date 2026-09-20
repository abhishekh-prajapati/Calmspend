import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import type { ApiResponse } from '../types/aa.types';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error('Unhandled request error:', message);

  const response: ApiResponse<null> = {
    data: null,
    error: message,
  };

  res.status(500).json(response);
}
