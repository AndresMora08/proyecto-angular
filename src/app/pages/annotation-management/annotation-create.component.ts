import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { NeighborhoodService } from '../../services/neighborhood/neighborhood.service';
// 1. IMPORTANTE: Importa tu tabla genérica (asegúrate de que la ruta sea correcta)
import { GenericTableComponent } from '../../components/ui/table/generic-table/generic-table.component'; 
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { Annotation } from '../../models/Annotation';

@Component({
  selector: 'app-annotation-create',
  templateUrl: './annotation-create.component.html',
  standalone: true,
  // 2. IMPORTANTE: Agrega GenericTableComponent a los imports
  imports: [CommonModule, ReactiveFormsModule, GenericTableComponent]
})
export class AnnotationCreateComponent implements OnInit {
  annotationForm!: FormGroup;
  annotations: Annotation[] = []; // Para la tabla

  // 3. Define las columnas para la tabla genérica
    public columns: any[] = [
        { header: 'Descripción', field: 'description' },
        { header: 'Estado', field: 'status' },
        { header: 'Latitud', field: 'latitude' },
        { header: 'Longitud', field: 'longitude' }
    ];

  categories = [
    'Seguridad', 'Infraestructura', 'Vías y tránsito', 'Servicios públicos', 
    'Ambiente', 'Espacio público', 'Residuos', 'Salud', 'Educación', 
    'Movilidad', 'Riesgo', 'Ruido', 'Alumbrado', 'Comercio', 'Otro'
  ];
  
  private map!: L.Map;
  private marker?: L.Marker;
  private neighborhoodsLayer!: L.GeoJSON;

  constructor(
    private fb: FormBuilder,
    private annotationService: AnnotationService,
    private neighborhoodService: NeighborhoodService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initMap();
    this.loadNeighborhoods();
    this.loadAnnotations(); // Cargamos la tabla
  }

  // Carga inicial para la tabla
  loadAnnotations(): void {
    this.annotationService.getAll().subscribe(data => {
      this.annotations = data;
    });
  }

  private initForm(): void {
    this.annotationForm = this.fb.group({
        description: ['', Validators.required],
        latitude: [0, Validators.required],
        longitude: [0, Validators.required],
        id_neighborhood: [null],
        id_citizen: [1],
        // Campos nuevos añadidos para el formulario completo
        selectedCategories: [[]],
        entities: [[]],
        photos: [null]
    });
    }

  private initMap(): void {
    this.map = L.map('map-annotation').setView([5.0681, -75.5173], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);
    
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.annotationForm.patchValue({ latitude: lat, longitude: lng });
      
      if (this.marker) this.map.removeLayer(this.marker);
      this.marker = L.marker([lat, lng]).addTo(this.map);
      this.validateNeighborhood(lat, lng);
    });
  }

  private loadNeighborhoods(): void {
    this.neighborhoodService.getAll().subscribe(data => {
      this.neighborhoodsLayer = L.geoJSON(data as any).addTo(this.map);
    });
  }

  private validateNeighborhood(lat: number, lng: number): void {
    let foundId: number | null = null;
    const point = L.latLng(lat, lng);

    this.neighborhoodsLayer.eachLayer((layer: any) => {
      if (layer instanceof L.Polygon && layer.getBounds().contains(point)) {
        foundId = layer.feature?.properties?.id_neighborhood || null;
      }
    });

    if (foundId) {
      this.annotationForm.patchValue({ id_neighborhood: foundId });
    } else {
      this.annotationForm.patchValue({ id_neighborhood: null });
      Swal.fire({
        title: 'Fuera de zona',
        text: 'Punto fuera de barrio. ¿Guardar sin barrio?',
        icon: 'warning',
        showCancelButton: true
      }).then((result) => {
        if (!result.isConfirmed) this.resetMarker();
      });
    }
  }

  public resetMarker(): void {
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = undefined;
    }
    this.annotationForm.patchValue({ latitude: 0, longitude: 0, id_neighborhood: null });
  }

  onSubmit(): void {
    if (this.annotationForm.invalid) return;
    const newAnnotation: Annotation = { ...this.annotationForm.value, status: 'PENDIENTE' };

    this.annotationService.create(newAnnotation).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Anotación creada', 'success');
        this.annotationForm.reset({ id_citizen: 1 });
        this.resetMarker();
        this.loadAnnotations(); // Recargamos la tabla después de guardar
      },
      error: () => Swal.fire('Error', 'No se pudo guardar', 'error')
    });
  }
}