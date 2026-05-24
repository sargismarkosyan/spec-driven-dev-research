import type { Response } from 'express';

export function sendError(res: Response, message: string, status: number) {
  return res.status(status).json({ error: message });
}

export function sendOk(res: Response, data: Record<string, unknown> = { ok: true }) {
  return res.json(data);
}
