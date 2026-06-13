import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

export interface OfficialLocation {
  id_official: number;
  name: string;
  id_entity: number;
  latitude: number;
  longitude: number;
  is_online: boolean;
  last_updated: string;
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private socket!: Socket;
  private locationStream$ = new Subject<OfficialLocation[]>();

  constructor() {
    this.connectToSocket();
  }

  private connectToSocket(): void {
    const socketUrl = environment.apiUrl || 'http://localhost:5000';
    
    this.socket = io(socketUrl, {
      transports: ['websocket'],
      autoConnect: true
    });

    // Escucha el canal de actualización que emita tu Flask Backend
    this.socket.on('official_locations_update', (data: OfficialLocation[]) => {
      this.locationStream$.next(data);
    });
  }

  getOfficialLocationsStream(): Observable<OfficialLocation[]> {
    return this.locationStream$.asObservable();
  }
}