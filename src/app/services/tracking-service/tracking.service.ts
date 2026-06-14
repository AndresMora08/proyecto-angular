import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface OfficialLocation {
  id_official: number;
  name: string;
  id_entity: number;
  latitude: number;
  longitude: number;
  is_online: boolean;
  last_updated: string;
  avatar: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private socket!: Socket;

  constructor() {
    const socketUrl = environment.apiUrl || 'http://127.0.0.1:5000';
    this.socket = io(socketUrl, {
      transports: ['polling'],
      upgrade: false,
      autoConnect: true,
      forceNew: true,
      reconnectionAttempts: 5,
      timeout: 10000,
      closeOnBeforeunload: true
    });
  }
  getOfficialLocationsStream(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('official_tracking', (data: { officials: any[] }) => {
        observer.next(data);
      });
    });
  }

  emitStartTracking(ids: number[]): void {
    this.socket.emit('start_tracking', ids);
  }
}