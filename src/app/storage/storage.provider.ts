import { InjectionToken } from '@angular/core';

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * 💡 Token de Inyección de Angular.
 * Nos permite inyectar la interfaz en los constructores de nuestros componentes y servicios
 */
export const STORAGE_PROVIDER = new InjectionToken<StorageProvider>('StorageProvider');