import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { StorageProvider } from '../storage/storage.provider'; // Ajusta la ruta

@Injectable({
  providedIn: 'root'
})
export class CookieStorageProvider implements StorageProvider {
  
  // Inyectamos el servicio que configuramos en el app.config
  constructor(private cookieService: CookieService) {}

  getItem(key: string): string | null {
    // Retorna el valor si existe, o null si no existe (cumpliendo la firma de tu interfaz)
    return this.cookieService.check(key) ? this.cookieService.get(key) : null;
  }

  setItem(key: string, value: string): void {
    // Guarda la cookie. El '7' indica que expirará automáticamente en 7 días
    // El '/' asegura que la cookie esté disponible en todas las páginas de tu app
    this.cookieService.set(key, value, 7, '/');
  }

  removeItem(key: string): void {
    // Borra una cookie específica
    this.cookieService.delete(key, '/');
  }

  clear(): void {
    // Borra absolutamente todas las cookies del sitio
    this.cookieService.deleteAll('/');
  }
}