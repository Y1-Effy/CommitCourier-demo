import type { Response } from "express";

/** Connected Server-Sent-Events clients (the live demo + stats pages subscribe here). */
const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

/** Push an event to every connected client (best-effort). */
export function broadcast(event: unknown): void {
  const frame = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
