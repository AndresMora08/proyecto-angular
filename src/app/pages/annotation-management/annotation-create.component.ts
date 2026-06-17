import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { VoteService } from '../../services/vote/vote.service';
import { SecurityService } from '../../services/auth/oauth.service';
import { CategoryService } from '../../services/category/category.service';
import { EntityService } from '../../services/entity/entity.service';
import { CommuneService } from '../../services/commune/commune.service';
import { NeighborhoodService } from '../../services/neighborhood/neighborhood.service';
import { Vote } from '../../models/Vote';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { Annotation } from '../../models/Annotation';
import { forkJoin, of, Observable } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../services/environments/environment';
import { PointService } from '../../services/point/point.service';
import { Point } from '../../models/Point';

@Component({
  selector: 'app-annotation-create',
  templateUrl: './annotation-create.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class AnnotationCreateComponent implements OnInit, AfterViewInit {
  annotationForm!: FormGroup;
  annotations: Annotation[] = [];
  filteredAnnotations: Annotation[] = [];
  selectedFiles: File[] = [];
  
  // Listas maestras reales del Backend
  entitiesList: any[] = [];
  categories: any[] = [];
  communesList: any[] = [];
  neighborhoodsList: any[] = [];

  // Filtros vinculados por ngModel
  filterCommune: string = '';
  filterNeighborhood: string = '';
  filterCategory: string = '';

  private map!: L.Map;
  private currentMarker: L.Marker | null = null;
  private markers: L.Marker[] = [];
  private neighborhoodPolygons: {
    polygon: L.Polygon;
    neighborhoodId: number;
  }[] = [];
  allPoints: Point[] = [];
  

  constructor(
  private fb: FormBuilder,
  private annotationService: AnnotationService,
  private voteService: VoteService,
  private securityService: SecurityService,
  private categoryService: CategoryService,
  private entityService: EntityService,
  private communeService: CommuneService,
  private neighborhoodService: NeighborhoodService,
  private pointService: PointService
) {}

  ngOnInit(): void {
    // Solución nativa al error 404 de Leaflet utilizando iconos CDN estables
    const iconDefault = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = iconDefault;

    this.annotationForm = this.fb.group({
      id_citizen: [1, Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      id_neighborhood: [null, Validators.required],
      selectedCategories: [[]],
      entities: [null]
    });

    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map-annotation').setView([5.06889, -75.51738], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {

      const { lat, lng } = e.latlng;

      const neighborhoodId =
        this.findNeighborhoodByPoint(lat, lng);

      if (!neighborhoodId) {

        Swal.fire(
          'Ubicación inválida',
          'La anotación debe estar dentro de un barrio demarcado.',
          'warning'
        );

        return;
      }

      this.annotationForm.patchValue({
        id_neighborhood: neighborhoodId
      });

      this.setFormCoordinates(lat, lng);
    });
    if (this.allPoints.length > 0) {
      this.drawNeighborhoodPolygons();
    }
  }

  setFormCoordinates(lat: number, lng: number): void {
    this.annotationForm.patchValue({ latitude: lat, longitude: lng });
    if (this.currentMarker) {
      this.currentMarker.setLatLng([lat, lng]);
    } else {
      this.currentMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.currentMarker.on('dragend', () => {

        const position = this.currentMarker!.getLatLng();

        const neighborhoodId =
          this.findNeighborhoodByPoint(
            position.lat,
            position.lng
          );

        if (!neighborhoodId) {

          Swal.fire(
            'Ubicación inválida',
            'La anotación debe permanecer dentro de un barrio.',
            'warning'
          );

          this.currentMarker!.setLatLng([
            this.annotationForm.value.latitude,
            this.annotationForm.value.longitude
          ]);

          return;
        }

        this.annotationForm.patchValue({
          latitude: position.lat,
          longitude: position.lng,
          id_neighborhood: neighborhoodId
        });
      });
    }
  }

  resetMarker(): void {
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = null;
    }
    this.annotationForm.reset({ id_citizen: 1, selectedCategories: [], entities: null });
    this.selectedFiles = [];
  }

  loadInitialData(): void {
    forkJoin({
      coms: this.communeService.getAll().pipe(catchError(() => of([]))),
      barrios: this.neighborhoodService.getAll().pipe(catchError(() => of([]))),
      points: this.pointService.getAll().pipe(catchError(() => of([]))),
      cats: this.categoryService.getAll().pipe(catchError(() => of([]))),
      ents: this.entityService.getAll().pipe(catchError(() => of([])))
    }).subscribe({
      next: (res) => {
        this.communesList = res.coms;
        this.neighborhoodsList = res.barrios;
        this.categories = res.cats;
        this.entitiesList = res.ents;
        this.allPoints = res.points;

        if (this.map) {
          this.drawNeighborhoodPolygons();
        }

        this.loadAnnotations();
      },
      error: (err) => console.error('Error cargando catálogos iniciales:', err)
    });
  }

  loadAnnotations(): void {
    forkJoin({
      annotationsData: this.annotationService.getAll(),
      votesData: this.voteService.getAll().pipe(catchError(() => of([]))),
      // Consumo real de la tabla pivote de relaciones en el Backend
      allPivotCategories: this.annotationService['http'].get<any[]>(`${environment.apiUrl}/annotation-categories`).pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ annotationsData, votesData, allPivotCategories }) => {
        this.annotations = annotationsData.map((item: any) => {
          const id = item.id_annotation;

          // 1. Mapeo y cálculo de calificaciones reales
          const votes = votesData.filter((vote: any) => Number(vote.id_annotation) === Number(id));
          const validVotes = votes
            .map((vote: any) => Number(vote.stars || vote.rating))
            .filter((stars: number) => Number.isFinite(stars) && stars > 0);
          const averageRating = validVotes.length
            ? validVotes.reduce((sum: number, stars: number) => sum + stars, 0) / validVotes.length
            : null;
          const comments = votes
            .map((vote: any) => String(vote.comment || '').trim())
            .filter((comment: string) => comment.length > 0);

          // 2. Cruce Relacional Real sin LocalStorage
          const pivotMatches = allPivotCategories.filter((pc: any) => Number(pc.id_annotation) === Number(id));
          const realCategories = pivotMatches.map((pc: any) => {
            const masterCat = this.categories.find(c => Number(c.id_category || c.id) === Number(pc.id_category));
            return masterCat ? { id_category: masterCat.id_category || masterCat.id, name: masterCat.name } : null;
          }).filter(c => c !== null);

          return {
            ...item,
            categories: item.categories && item.categories.length > 0 ? item.categories : realCategories,
            entities_text: item.entities_text || 'Ninguna',
            evidences: item.evidences || [],
            averageRating,
            voteCount: validVotes.length,
            voteComments: comments
          };
        });

        this.filteredAnnotations = [...this.annotations];
        this.drawAnnotationsOnMap(this.filteredAnnotations);
      },
      error: (err) => console.error('Error al procesar anotaciones con backend:', err)
    });
  }

  drawAnnotationsOnMap(annotationsToDraw: Annotation[]): void {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    annotationsToDraw.forEach(ann => {
      if (!ann.latitude || !ann.longitude) return;

      const marker = L.marker([ann.latitude, ann.longitude]).addTo(this.map);
      
      let popupContent = `
        <div style="font-family: sans-serif; min-w-[200px]">
          <h4 style="margin:0 0 5px; color:#1e1b4b; font-size:14px;">Anotación #${ann.id_annotation}</h4>
          <p style="margin:0 0 8px; font-size:12px; color:#374151;">${ann.description}</p>
          <div style="margin-bottom:6px;">
      `;

      if (ann.categories && ann.categories.length > 0) {
        popupContent += `<span style="font-size:10px; font-weight:bold; color:#4f46e5; block">Categorías:</span> `;
        ann.categories.forEach((c: any) => {
          popupContent += `<span style="display:inline-block; background:#eef2ff; color:#4f46e5; padding:2px 6px; border-radius:4px; font-size:10px; margin-right:4px;">${c.name}</span>`;
        });
      }

      popupContent += `
          </div>
          <div style="margin-top:8px; border-top:1px solid #e5e7eb; padding-top:6px; display:flex; justify-content:space-between;">
            <button id="btn-rate-${ann.id_annotation}" style="background:#4f46e5; color:white; border:none; padding:4px 8px; font-size:11px; border-radius:4px; cursor:pointer;">Calificar</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btnRate = document.getElementById(`btn-rate-${ann.id_annotation}`);
          if (btnRate) {
            btnRate.onclick = () => {
              marker.closePopup();
              this.openRatingModal(ann);
            };
          }
        }, 10);
      });

      this.markers.push(marker);
    });
  }

  applyFilters(): void {
    this.filteredAnnotations = this.annotations.filter(ann => {
      if (this.filterCommune) {
        const barrioObj = this.neighborhoodsList.find(n => n.id_neighborhood === ann.id_neighborhood);
        if (!barrioObj || barrioObj.id_commune !== Number(this.filterCommune)) {
          return false;
        }
      }

      if (this.filterNeighborhood && ann.id_neighborhood !== Number(this.filterNeighborhood)) {
        return false;
      }

      if (this.filterCategory) {
        if (!ann.categories || !Array.isArray(ann.categories) || ann.categories.length === 0) {
          return false;
        }
        const cumpleCat = ann.categories.some((c: any) => {
          const idTarget = c.id_category || c.id;
          return Number(idTarget) === Number(this.filterCategory);
        });
        if (!cumpleCat) return false;
      }

      return true;
    });

    this.drawAnnotationsOnMap(this.filteredAnnotations);
  }

  clearFilters(): void {
    this.filterCommune = '';
    this.filterNeighborhood = '';
    this.filterCategory = '';
    this.filteredAnnotations = [...this.annotations];
    this.drawAnnotationsOnMap(this.filteredAnnotations);
  }

  toggleCategory(cat: any): void {
    const id = cat.id_category || cat.id;
    const current: number[] = this.annotationForm.get('selectedCategories')?.value || [];
    if (current.includes(id)) {
      this.annotationForm.patchValue({ selectedCategories: current.filter(x => x !== id) });
    } else {
      this.annotationForm.patchValue({ selectedCategories: [...current, id] });
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files && event.target.files.length > 0) {
      this.selectedFiles = [event.target.files[0]];
    }
  }

  onSubmit(): void {
    if (this.annotationForm.invalid) {
      Swal.fire('Atención', 'Por favor diligencie los campos obligatorios y marque un punto en el mapa.', 'warning');
      return;
    }

    const formValue = this.annotationForm.value;
    const annotationPayload: Annotation = {
      id_citizen: Number(formValue.id_citizen),
      description: formValue.description,
      latitude: Number(formValue.latitude),
      longitude: Number(formValue.longitude),
      id_neighborhood: Number(formValue.id_neighborhood),
      status: 'Activo' 
    };
    this.annotationService.create(annotationPayload).pipe(
      switchMap((createdAnnotation: any) => {
        const idAnnotation = createdAnnotation.id_annotation;
        const requests: Observable<any>[] = [];
        const selectedCats: number[] = formValue.selectedCategories || [];
        selectedCats.forEach(catId => {
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/annotation-categories`, {
              id_annotation: idAnnotation,
              id_category: catId
            })
          );
        });

        // 2. Guardar Entidades vinculadas en Backend Real
        if (formValue.entities) {
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/annotation-entities`, {
              id_annotation: idAnnotation,
              id_entity: Number(formValue.entities)
            })
          );
        }

        // 3. Guardar Evidencias si existen
        if (this.selectedFiles.length > 0) {
          const fd = new FormData();
          fd.append('id_annotation', String(idAnnotation));
          fd.append('file', this.selectedFiles[0]);
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/evidences`, fd)
          );
        }

        // Ejecutamos todo de forma paralela en el servidor, si no hay extras devolvemos la anotación
        return requests.length > 0 ? forkJoin(requests) : of(createdAnnotation);
      })
    ).subscribe({
      next: () => {
        Swal.fire('Éxito', 'Anotación creada con éxito en el territorio', 'success');
        this.resetMarker();
        this.loadAnnotations(); // Recarga limpia desde la base de datos
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo registrar la anotación en el servidor.', 'error');
      }
    });
  }

  openRatingModal(ann: Annotation): void {
    const citizenId = 1; 
    
    this.voteService.getAll().pipe(catchError(() => of([]))).subscribe((allVotes: any[]) => {
      const existing = allVotes.find((v: any) => 
        Number(v.id_annotation) === Number(ann.id_annotation) && Number(v.id_citizen) === citizenId
      );
      
      const existingVoteId = existing ? (existing.id_vote || existing.id) : null;

      Swal.fire({
        title: existingVoteId ? 'Actualizar Calificación' : 'Calificar Problemática',
        html: `
          <div class="mb-3">
            <label class="block text-sm font-semibold mb-1">Estrellas (1-5)</label>
            <input type="number" id="swal-stars" class="swal2-input" min="1" max="5" value="${existing ? (existing.stars || existing.rating || 5) : 5}">
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1">Comentario u Opinión</label>
            <textarea id="swal-comment" class="swal2-textarea" placeholder="Escribe tu opinión...">${existing ? (existing.comment || '') : ''}</textarea>
          </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: existingVoteId ? 'Actualizar' : 'Votar',
        preConfirm: () => {
          const stars = Number((document.getElementById('swal-stars') as HTMLInputElement).value);
          const comment = (document.getElementById('swal-comment') as HTMLTextAreaElement).value;
          if (!stars || stars < 1 || stars > 5) {
            Swal.showValidationMessage('Las estrellas deben ser un número entre 1 y 5');
            return false;
          }
          return { stars, comment };
        }
      }).then((result) => {
        if (!result.isConfirmed || !result.value) return;

        const payload: Vote = {
          id_citizen: citizenId,
          id_annotation: Number(ann.id_annotation),
          stars: result.value.stars,
          comment: result.value.comment || ''
        };

        if (existingVoteId) {
          this.voteService.update(existingVoteId, payload).subscribe({
            next: () => {
              Swal.fire('Actualizado', 'Tu calificación fue guardada en el servidor.', 'success');
              this.loadAnnotations();
            },
            error: () => Swal.fire('Error', 'No se pudo actualizar la calificación.', 'error'),
          });
        } else {
          this.voteService.create(payload).subscribe({
            next: () => {
              Swal.fire('Gracias', 'Tu voto fue registrado en el servidor.', 'success');
              this.loadAnnotations();
            },
            error: () => Swal.fire('Error', 'No se pudo registrar la calificación.', 'error'),
          });
        }
      });
    });
  }
  private drawNeighborhoodPolygons(): void {

this.neighborhoodPolygons.forEach(item => {
      this.map.removeLayer(item.polygon);
    });

    this.neighborhoodPolygons = [];

    this.neighborhoodsList.forEach((neighborhood: any) => {

      const vertices = this.allPoints
        .filter(p => p.id_neighborhood === neighborhood.id_neighborhood)
        .sort((a, b) => a.order - b.order)
        .map(p => [p.latitude, p.longitude] as [number, number]);

      if (vertices.length < 3) {
        return;
      }

      const polygon = L.polygon(vertices, {
        color: '#4f46e5',
        weight: 2,
        fillColor: '#6366f1',
        fillOpacity: 0.15
      });

      polygon.bindTooltip(neighborhood.name, {
        permanent: false,
        direction: 'center'
      });

      polygon.addTo(this.map);

      this.neighborhoodPolygons.push({
        polygon,
        neighborhoodId: neighborhood.id_neighborhood
      });
    });
  }
  private findNeighborhoodByPoint(
    lat: number,
    lng: number
  ): number | null {

    const point = L.latLng(lat, lng);

    for (const item of this.neighborhoodPolygons) {

      const polygon = item.polygon;

      const latlngs = polygon.getLatLngs()[0] as L.LatLng[];

      if (this.isPointInsidePolygon(point, latlngs)) {
        return item.neighborhoodId;
      }
    }

    return null;
  }
  
  private isPointInsidePolygon(
    point: L.LatLng,
    polygon: L.LatLng[]
  ): boolean {

    let inside = false;

    for (
      let i = 0, j = polygon.length - 1;
      i < polygon.length;
      j = i++
    ) {

      const xi = polygon[i].lng;
      const yi = polygon[i].lat;

      const xj = polygon[j].lng;
      const yj = polygon[j].lat;

      const intersect =
        ((yi > point.lat) !== (yj > point.lat)) &&
        (
          point.lng <
          ((xj - xi) * (point.lat - yi)) /
          (yj - yi) +
          xi
        );

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }
}