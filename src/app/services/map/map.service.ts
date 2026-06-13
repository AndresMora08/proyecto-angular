import { Injectable } from '@angular/core';
import * as L from 'leaflet';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private map!: L.Map;
  private markersGroup!: L.LayerGroup;

  // Iconos por defecto de Leaflet a veces fallan en Angular, definimos configuraciones personalizadas
  private greenIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  private greyIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  constructor() {}

  /**
   * Inicializa el mapa en un contenedor HTML específico
   * @param elementId ID del div HTML (ej. 'map')
   * @param center Coordenadas [lat, lng] de inicio (Por defecto Manizales/Colombia)
   * @param zoom Nivel de zoom inicial
   */
  initMap(elementId: string, center: [number, number] = [5.0681, -75.5174], zoom: number = 13): void {
    if (this.map) {
      this.destroyMap();
    }

    this.map = L.map(elementId).setView(center, zoom);

    // Capa de mapa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

    // Grupo de capas dedicado a los marcadores de funcionarios para limpiarlos fácilmente
    this.markersGroup = L.layerGroup().addTo(this.map);
  }

  /**
   * Limpia todos los marcadores actuales del mapa
   */
  clearMarkers(): void {
    if (this.markersGroup) {
      this.markersGroup.clearLayers();
    }
  }

  /**
   * Añade un marcador personalizado de funcionario
   */
  addOfficialMarker(lat: number, lng: number, popupHtml: string, isOnline: boolean, name: string): void {
    if (!this.map || !this.markersGroup) return;

    // Flujo alternativo 4a: Si está desconectado, cambiamos el icono a gris y bajamos opacidad
    const markerOptions: L.MarkerOptions = {
      icon: isOnline ? this.greenIcon : this.greyIcon,
      opacity: isOnline ? 1.0 : 0.5,
      title: name
    };

    const marker = L.marker([lat, lng], markerOptions);
    marker.bindPopup(popupHtml);
    
    this.markersGroup.addLayer(marker);
  }

  /**
   * Destruye la instancia del mapa al salir de la pantalla
   */
  destroyMap(): void {
    if (this.map) {
      this.map.remove();
    }
  }
}