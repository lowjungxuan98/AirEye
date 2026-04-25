import type { Response } from "express";

function applySseHeaders(res: Response): void {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

export function writeSseData(res: Response, data: unknown): void {
  if (!res.headersSent) {
    applySseHeaders(res);
  }
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
