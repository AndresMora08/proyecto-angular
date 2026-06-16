import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { VoteService } from '../../services/vote/vote.service';
import { SecurityService } from '../../services/auth/oauth.service';
// 💡 Importamos tus servicios reales de categorías y entidades
import { CategoryService } from '../../services/category/category.service';
import { EntityService } from '../../services/entity/entity.service';
import { Vote } from '../../models/Vote';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { Annotation } from '../../models/Annotation';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../services/environments/environment';

@Component({
  selector: 'app-annotation-create',
  templateUrl: './annotation-create.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AnnotationCreateComponent implements OnInit, AfterViewInit {
  annotationForm!: FormGroup;
  annotations: Annotation[] = []; 
  selectedFiles: File[] = [];
  
  // 💡 Colecciones dinámicas que poblará el Backend
  entitiesList: any[] = [];
  categories: any[] = [];

  private map!: L.Map;
  private currentMarker: L.Marker | null = null;
  private markers: L.Marker[] = [];

  constructor(
    private fb: FormBuilder,
    private annotationService: AnnotationService,
    private voteService: VoteService,
    private securityService: SecurityService,
    // 💡 Inyectamos correctamente ambos servicios en el constructor
    private categoryService: CategoryService,
    private entityService: EntityService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadBackendData(); // 💡 Llamamos a la consulta del servidor
    this.loadAnnotations();
  }
  
  ngAfterViewInit(): void {
    this.initMap();
  }

  private initForm(): void {
    this.annotationForm = this.fb.group({
      description: ['', Validators.required],
      latitude: [0, Validators.required],
      longitude: [0, Validators.required],
      id_neighborhood: [null],
      id_citizen: [1],
      selectedCategories: [[]], // 💡 Guardará un arreglo con las PKs numéricas (id_category)
      entities: [null],
      photos: [null]
    });
  }

  // 💡 Nuevo método para disparar las peticiones HTTP concurrentes al backend
  private loadBackendData(): void {
    forkJoin({
      categoriesData: this.categoryService.getAll(),
      entitiesData: this.entityService.getAll()
    }).subscribe({
      next: (res) => {
        // Asignamos las respuestas tipadas directamente desde tus servicios
        this.categories = res.categoriesData || [];
        this.entitiesList = res.entitiesData || [];
      },
      error: (err) => {
        console.error('Error al conectar con la API de Flask:', err);
        Swal.fire('Error de carga', 'No se pudieron recuperar las categorías ni entidades reales.', 'error');
      }
    });
  }

  private initMap(): void {
    this.map = L.map('map-annotation').setView([5.06889, -75.51738], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.setMarker(lat, lng);
    });
  }

  setMarker(lat: number, lng: number): void {
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
    }
    this.currentMarker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    this.annotationForm.patchValue({ latitude: lat, longitude: lng });

    this.currentMarker.on('dragend', () => {
      if (this.currentMarker) {
        const position = this.currentMarker.getLatLng();
        this.annotationForm.patchValue({ latitude: position.lat, longitude: position.lng });
      }
    });
  }

  resetMarker(): void {
    if (this.currentMarker) {
      this.map.removeLayer(this.currentMarker);
      this.currentMarker = null;
    }
    this.annotationForm.patchValue({ latitude: 0, longitude: 0 });
  }

  // 💡 Corregido: El toggle ahora evalúa objetos de categoría reales usando su 'id_category'
  toggleCategory(cat: any): void {
    const current: number[] = this.annotationForm.get('selectedCategories')?.value || [];
    const catId = cat.id_category;

    if (current.includes(catId)) {
      this.annotationForm.patchValue({ selectedCategories: current.filter((id: number) => id !== catId) });
    } else {
      this.annotationForm.patchValue({ selectedCategories: [...current, catId] });
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  loadAnnotations(): void {
    forkJoin({
      annotationsData: this.annotationService.getAll(),
      votesData: this.voteService.getAll().pipe(catchError(() => of([])))
    }).subscribe(({ annotationsData, votesData }: { annotationsData: any[]; votesData: any[] }) => {
      const localCache = JSON.parse(localStorage.getItem('annotations_metadata') || '{}');

      this.annotations = annotationsData.map((item: any) => {
        const id = item.id_annotation;
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

        if (id && localCache[id]) {
          return {
            ...item,
            categories: localCache[id].categories || [],
            entities_text: localCache[id].entities_text || 'Ninguna',
            evidences: localCache[id].evidences || [],
            averageRating,
            voteCount: validVotes.length,
            voteComments: comments
          };
        }
        return {
          ...item,
          categories: [],
          entities_text: 'Ninguna',
          evidences: [],
          averageRating,
          voteCount: validVotes.length,
          voteComments: comments
        };
      });

      this.drawAnnotationsOnMap(this.annotations); 
    });
  }

  private drawAnnotationsOnMap(annotations: Annotation[]): void {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    annotations.forEach(ann => {
      const categoriesBadge = Array.isArray(ann.categories) && ann.categories.length > 0
        ? ann.categories.map((c: any) => 
            `<span style="background-color: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-right: 4px; display: inline-block; margin-top: 4px;">
              ${c.name}
            </span>`
          ).join('')
        : '<span style="color: #9ca3af; font-size: 11px; font-style: italic;">Sin categorías</span>';

      let imageHtml = '';
      if (ann.evidences && ann.evidences.length > 0) {
        const firstEvidence = ann.evidences[0];
        const imageUrl = firstEvidence.is_local 
          ? firstEvidence.dataUrl 
          : `http://127.0.0.1:5000/static/uploads/${firstEvidence.file_url}`;

        imageHtml = `<div style="margin-top: 8px;">
                      <img src="${imageUrl}" alt="Evidencia" style="width: 100%; max-height: 110px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb;"/>
                     </div>`;
      } else {
        imageHtml = `<div style="margin-top: 8px;">
                      <div style="width: 100%; height: 50px; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #9ca3af; font-size: 10px;">
                        📷 Sin imagen adjunta
                      </div>
                     </div>`;
      }

      const ratingText = (ann as any).averageRating
        ? `${Number((ann as any).averageRating).toFixed(1)} / 5 (${(ann as any).voteCount} ${(ann as any).voteCount === 1 ? 'voto' : 'votos'})`
        : 'Sin calificación';
      const comments = Array.isArray((ann as any).voteComments) ? (ann as any).voteComments : [];
      const commentsHtml = comments.length > 0
        ? comments.slice(0, 3).map((comment: string) => `
            <div style="margin-top:4px; background:#f9fafb; border:1px solid #eef2ff; border-radius:6px; padding:5px 6px; color:#374151; font-size:11px; line-height:1.35;">
              ${this.escapeHtml(comment)}
            </div>
          `).join('')
        : '<span style="color:#9ca3af; font-size:11px; font-style:italic;">Sin comentarios</span>';

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; width: 220px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 9999px; 
                         background-color: ${ann.status === 'PENDIENTE' ? '#fef3c7' : '#d1fae5'}; 
                         color: ${ann.status === 'PENDIENTE' ? '#d97706' : '#065f46'};">
              ${ann.status}
            </span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #1f2937; line-height: 1.4;">
            ${ann.description}
          </h4>
          <div style="margin-top: 4px; font-size: 11px; color: #4b5563;">
            <strong>Entidad:</strong> ${ann.entities_text || 'Ninguna'}
          </div>
          <div style="margin-top: 6px; border-top: 1px solid #f3f4f6; padding-top: 4px;">
            <span style="font-size: 10px; color: #6b7280; font-weight: 500; display: block;">Categorías:</span>
            ${categoriesBadge}
          </div>
          ${imageHtml}
          <div style="margin-top:8px; border-top:1px solid #f3f4f6; padding-top:6px;">
            <div style="font-size:11px; color:#374151; margin-bottom:4px;">
              <strong>Calificación:</strong> ${this.escapeHtml(ratingText)}
            </div>
            <div style="font-size:11px; color:#374151;">
              <strong>Comentario:</strong>
              <div style="margin-top:3px;">${commentsHtml}</div>
            </div>
          </div>
          <div style="margin-top:8px; display:flex; gap:6px;">
            <button id="rate-btn-${ann.id_annotation}" style="flex:1; background:#4f46e5; color:#fff; border:none; padding:6px 8px; border-radius:6px; font-size:12px; cursor:pointer;">Calificar</button>
          </div>
        </div>
      `;

      const marker = L.marker([ann.latitude, ann.longitude]).addTo(this.map).bindPopup(popupContent);
      this.markers.push(marker);
      marker.on('popupopen', () => {
        setTimeout(() => {
          const btn = document.getElementById(`rate-btn-${ann.id_annotation}`);
          if (btn) {
            btn.addEventListener('click', () => this.openRatingModal(ann));
          }
        }, 50);
      });
    });
  }

  openRatingModal(ann: any): void {
    const currentUser = this.securityService.getCurrentUser();
    const citizenId = this.getCurrentCitizenId(currentUser);
    if (!citizenId) {
      Swal.fire('Inicia sesión', 'Debes iniciar sesión para calificar esta anotación.', 'warning');
      return;
    }

    this.voteService.search({ id_annotation: ann.id_annotation }).subscribe((res: any) => {
      const votes = this.extractArray(res);
      const existing = votes.find((v: any) => Number(v.id_citizen) === Number(citizenId));
      const existingVoteId = this.getVoteId(existing);

      let selectedStars = existing ? Number(existing.stars) : 0;
      const initialComment = existing?.comment || '';

      const starsHtml = [1, 2, 3, 4, 5].map(s =>
        `<button type="button" class="vote-star" data-star="${s}" aria-label="${s} estrella${s === 1 ? '' : 's'}" style="border:0;background:transparent;font-size:34px;line-height:1;color:${selectedStars >= s ? '#f59e0b' : '#d1d5db'};padding:0 3px;cursor:pointer;">&#9733;</button>`
      ).join('');

      Swal.fire({
        title: existing ? 'Editar calificación' : 'Calificar anotación',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${starsHtml}</div>
          <textarea id="vote-comment" class="swal2-textarea" placeholder="Comentario (opcional)" rows="3">${this.escapeHtml(initialComment)}</textarea>
        `,
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: existing ? 'Actualizar' : 'Enviar',
        didOpen: () => {
          const starButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.vote-star'));
          const paintStars = () => {
            starButtons.forEach(button => {
              const value = Number(button.dataset['star']);
              button.style.color = selectedStars >= value ? '#f59e0b' : '#d1d5db';
            });
          };

          starButtons.forEach(button => {
            button.addEventListener('click', () => {
              selectedStars = Number(button.dataset['star']);
              paintStars();
            });
          });
        },
        preConfirm: () => {
          const commentEl = document.getElementById('vote-comment') as HTMLTextAreaElement;
          const comment = commentEl ? commentEl.value : '';
          if (!selectedStars || selectedStars < 1 || selectedStars > 5) {
            Swal.showValidationMessage('Selecciona una calificación entre 1 y 5 estrellas.');
            return null;
          }
          return { stars: selectedStars, comment };
        }
      }).then((result) => {
        if (!result.isConfirmed || !result.value) return;

        const payload: Vote = {
          id_citizen: citizenId,
          id_annotation: Number(ann.id_annotation),
          stars: result.value.stars,
          comment: result.value.comment || ''
        };

        if (existing && existingVoteId) {
          this.voteService.update(existingVoteId, payload).subscribe({
            next: () => {
              Swal.fire('Actualizado', 'Tu calificación fue actualizada.', 'success');
              this.loadAnnotations();
            },
            error: () => Swal.fire('Error', 'No se pudo actualizar la calificación.', 'error'),
          });
        } else {
          this.voteService.create(payload).subscribe({
            next: () => {
              Swal.fire('Gracias', 'Tu calificación fue registrada.', 'success');
              this.loadAnnotations();
            },
            error: () => Swal.fire('Error', 'No se pudo registrar la calificación.', 'error'),
          });
        }
      });
    }, (err: any) => {
      console.error('Error buscando calificaciones:', err);
      Swal.fire('Error', 'No se pudo consultar las calificaciones existentes.', 'error');
    });
  }

  private getCurrentCitizenId(currentUser: any): number | null {
    if (!currentUser) return null;

    const possibleIds = [
      currentUser.id_citizen,
      currentUser.id,
      currentUser.id_user,
      currentUser.user?.id_citizen,
      currentUser.user?.id,
      currentUser.user?.id_user
    ];

    const id = possibleIds
      .map(value => Number(value))
      .find(value => Number.isFinite(value) && value > 0);

    return id || null;
  }

  private getVoteId(vote: any): number | null {
    if (!vote) return null;
    const id = Number(vote.id_vote || vote.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private extractArray(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.results)) return res.results;
    if (Array.isArray(res?.items)) return res.items;
    if (Array.isArray(res?.rows)) return res.rows;
    if (Array.isArray(res?.votes)) return res.votes;
    return [];
  }

  private escapeHtml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  onSubmit(): void {
    if (this.annotationForm.invalid) {
      Swal.fire('Error', 'Completa los campos obligatorios', 'error');
      return;
    }

    const formValue = this.annotationForm.value;
    const fileToUpload = this.selectedFiles.length > 0 ? this.selectedFiles[0] : null;

    const annotationPayload = {
      description: formValue.description,
      latitude: Number(formValue.latitude),
      longitude: Number(formValue.longitude),
      id_neighborhood: formValue.id_neighborhood ? Number(formValue.id_neighborhood) : null,
      id_citizen: formValue.id_citizen ? Number(formValue.id_citizen) : 1,
      status: 'PENDIENTE'
    };

    Swal.fire({
      title: 'Guardando anotación...',
      text: 'Registrando datos en el sistema.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.annotationService.create(annotationPayload as any).pipe(
      switchMap((createdAnnotation: any) => {
        const idAnnotation = createdAnnotation.id_annotation;
        const requests: any[] = [];

        // 💡 Corregido: Ahora iteramos las llaves primarias reales de la base de datos
        const selectedCatIds = formValue.selectedCategories || [];
        selectedCatIds.forEach((idCategory: number) => {
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/annotation-categories`, {
              id_annotation: idAnnotation,
              id_category: idCategory
            })
          );
        });

        if (formValue.entities && formValue.entities !== 'null') {
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/interested-parties`, {
              id_annotation: idAnnotation,
              id_entity: Number(formValue.entities)
            })
          );
        }

        if (fileToUpload) {
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('id_annotation', idAnnotation.toString());
          formData.append('file_type', fileToUpload.type);
          formData.append('file_size', fileToUpload.size.toString());
          formData.append('file_url', fileToUpload.name);
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/evidences`, formData)
          );
        }

        return requests.length > 0 ? forkJoin(requests).pipe(switchMap(() => of(createdAnnotation))) : of(createdAnnotation);
      })
    ).subscribe({
      next: (createdAnnotation: any) => {
        const id = createdAnnotation.id_annotation;
        const selectedEntityObj = this.entitiesList.find(e => e.id_entity === Number(formValue.entities));
        
        // 💡 Buscamos los nombres de las categorías correspondientes para guardarlos en el cache local de la vista
        const categoriesMapped = this.categories
          .filter(c => formValue.selectedCategories.includes(c.id_category))
          .map(c => ({ name: c.name }));

        const entityString = selectedEntityObj ? selectedEntityObj.name : 'Ninguna';

        if (fileToUpload) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            const metadata = {
              categories: categoriesMapped,
              entities_text: entityString,
              evidences: [{ file_url: fileToUpload.name, dataUrl: e.target.result, is_local: true }]
            };

            const currentCache = JSON.parse(localStorage.getItem('annotations_metadata') || '{}');
            currentCache[id] = metadata;
            localStorage.setItem('annotations_metadata', JSON.stringify(currentCache));

            this.loadAnnotations();
          };
          reader.readAsDataURL(fileToUpload);
        } else {
          const metadata = { categories: categoriesMapped, entities_text: entityString, evidences: [] };
          const currentCache = JSON.parse(localStorage.getItem('annotations_metadata') || '{}');
          currentCache[id] = metadata;
          localStorage.setItem('annotations_metadata', JSON.stringify(currentCache));
          
          this.loadAnnotations();
        }

        Swal.fire('Éxito', 'Anotación creada con éxito en el territorio', 'success');
        this.annotationForm.reset({ id_citizen: 1, selectedCategories: [], entities: null });
        this.selectedFiles = [];
        this.resetMarker();
      },
      error: (err) => {
        console.error(err);
        Swal.fire('Error', 'No se pudo registrar la anotación completa.', 'error');
      }
    });
  }
}
