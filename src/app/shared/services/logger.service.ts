import { Injectable, isDevMode } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoggerService {
  debug(message: string, context?: unknown): void {
    if (!isDevMode()) {
      return;
    }

    if (context !== undefined) {
      console.debug(message, context);
      return;
    }

    console.debug(message);
  }

  warn(message: string, context?: unknown): void {
    if (!isDevMode()) {
      return;
    }

    if (context !== undefined) {
      console.warn(message, context);
      return;
    }

    console.warn(message);
  }

  error(message: string, context?: unknown): void {
    if (!isDevMode()) {
      return;
    }

    if (context !== undefined) {
      console.error(message, context);
      return;
    }

    console.error(message);
  }
}
