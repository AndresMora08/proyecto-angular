import { Injectable } from '@angular/core';
import { StorageProvider } from '../storage/storage.provider'; // Ajusta la ruta

@Injectable({
  providedIn: 'root'
})
export class LocalStorageProvider implements StorageProvider {
  
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  clear(): void {
    localStorage.clear();
  }
}