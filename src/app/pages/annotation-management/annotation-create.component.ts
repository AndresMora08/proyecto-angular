import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AnnotationService } from '../../services/annotation/annotation.service';
import { VoteService } from '../../services/vote/vote.service';
import { SecurityService } from '../../services/auth/oauth.service';
import { Vote } from '../../models/Vote';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { Annotation } from '../../models/Annotation';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { environment } from '../../services/environments/environment';

@Component({
  selector: 'app-annotation-create',
  templateUrl: './annotation-create.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class AnnotationCreateComponent implements OnInit {
  annotationForm!: FormGroup;
  annotations: Annotation[] = []; 
  selectedFiles: File[] = [];

  entitiesList = [
    { id_entity: 1, name: 'Alcaldía Municipal' },
    { id_entity: 2, name: 'Policía Nacional (CAI)' },
    { id_entity: 3, name: 'Secretaría de Infraestructura' },
    { id_entity: 4, name: 'Empresa de Aseo / Aguas' }
  ];

  categories = [
    'Seguridad', 'Infraestructura', 'Vías y tránsito', 'Servicios públicos', 
    'Ambiente', 'Espacio público', 'Residuos', 'Salud', 'Educación', 
    'Movilidad', 'Riesgo', 'Ruido', 'Alumbrado', 'Comercio', 'Otro'
  ];

  private map!: L.Map;
  private currentMarker: L.Marker | null = null;
  private markers: L.Marker[] = [];

  constructor(
    private fb: FormBuilder,
    private annotationService: AnnotationService,
    private voteService: VoteService,
    private securityService: SecurityService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initMap();
    this.loadAnnotations();
  }

  private initForm(): void {
    this.annotationForm = this.fb.group({
      description: ['', Validators.required],
      latitude: [0, Validators.required],
      longitude: [0, Validators.required],
      id_neighborhood: [null],
      id_citizen: [1],
      selectedCategories: [[]],
      entities: [null],
      photos: [null]
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

  toggleCategory(cat: string): void {
    const current = this.annotationForm.get('selectedCategories')?.value || [];
    if (current.includes(cat)) {
      this.annotationForm.patchValue({ selectedCategories: current.filter((c: string) => c !== cat) });
    } else {
      this.annotationForm.patchValue({ selectedCategories: [...current, cat] });
    }
  }

  onFileSelected(event: any): void {
    if (event.target.files) {
      this.selectedFiles = Array.from(event.target.files);
    }
  }

  loadAnnotations(): void {
    this.annotationService.getAll().subscribe((data: any[]) => {
      const localCache = JSON.parse(localStorage.getItem('annotations_metadata') || '{}');

      this.annotations = data.map((item: any) => {
        const id = item.id_annotation;
        if (id && localCache[id]) {
          return {
            ...item,
            categories: localCache[id].categories || [],
            entities_text: localCache[id].entities_text || 'Ninguna',
            evidences: localCache[id].evidences || []
          };
        }
        return { ...item, categories: [], entities_text: 'Ninguna', evidences: [] };
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
          <div style="margin-top:8px; display:flex; gap:6px;">
            <button id="rate-btn-${ann.id_annotation}" style="flex:1; background:#4f46e5; color:#fff; border:none; padding:6px 8px; border-radius:6px; font-size:12px; cursor:pointer;">Calificar</button>
          </div>
        </div>
      `;

      const marker = L.marker([ann.latitude, ann.longitude]).addTo(this.map).bindPopup(popupContent);
      this.markers.push(marker);
      // Añadir listener para el botón de calificar dentro del popup
      marker.on('popupopen', () => {
        // pequeño delay para asegurar que el DOM del popup esté disponible
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
    if (!currentUser) {
      Swal.fire('Inicia sesión', 'Debes iniciar sesión para calificar esta anotación.', 'warning');
      return;
    }

    // Buscar si el usuario ya calificó esta anotación
    this.voteService.search({ id_annotation: ann.id_annotation }).subscribe((res: any) => {
      const votes = Array.isArray(res) ? res : (res?.data || []);
      const existing = votes.find((v: any) => v.id_citizen === (currentUser.id || currentUser.id_citizen || currentUser.id_user));

      const initialStars = existing ? existing.stars : 0;
      const initialComment = existing ? existing.comment : '';

      const starsHtml = [5,4,3,2,1].map(s =>
        `<label style="cursor:pointer;margin-right:6px;">
            <input type="radio" name="stars" value="${s}" style="display:none;" ${initialStars===s ? 'checked' : ''} />
            <span style="font-size:20px; color:${initialStars>=s ? '#f59e0b' : '#d1d5db'};">★</span>
         </label>`
      ).join('');

      Swal.fire({
        title: existing ? 'Editar calificación' : 'Calificar anotación',
        html: `
          <div style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${starsHtml}</div>
          <textarea id="vote-comment" class="swal2-textarea" placeholder="Comentario (opcional)" rows="3">${initialComment || ''}</textarea>
        `,
        showCancelButton: true,
        confirmButtonText: existing ? 'Actualizar' : 'Enviar',
        preConfirm: () => {
          const selected = (document.querySelector('input[name="stars"]:checked') as HTMLInputElement);
          const stars = selected ? parseInt(selected.value, 10) : 0;
          const commentEl = document.getElementById('vote-comment') as HTMLTextAreaElement;
          const comment = commentEl ? commentEl.value : '';
          if (!stars || stars < 1 || stars > 5) {
            Swal.showValidationMessage('Selecciona una calificación entre 1 y 5 estrellas.');
            return null;
          }
          return { stars, comment };
        }
      }).then((result) => {
        if (!result.isConfirmed || !result.value) return;

        const payload: Vote = {
          id_citizen: currentUser.id || currentUser.id_citizen || currentUser.id_user || 1,
          id_annotation: ann.id_annotation,
          stars: result.value.stars,
          comment: result.value.comment || ''
        };

        if (existing && existing.id) {
          this.voteService.update(existing.id, payload).subscribe({
            next: () => Swal.fire('Actualizado', 'Tu calificación fue actualizada.', 'success'),
            error: () => Swal.fire('Error', 'No se pudo actualizar la calificación.', 'error')
          });
        } else {
          this.voteService.create(payload).subscribe({
            next: () => Swal.fire('Gracias', 'Tu calificación fue registrada.', 'success'),
            error: () => Swal.fire('Error', 'No se pudo registrar la calificación.', 'error')
          });
        }
      });
    }, (err: any) => {
      console.error('Error buscando calificaciones:', err);
      Swal.fire('Error', 'No se pudo consultar las calificaciones existentes.', 'error');
    });
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

        const selectedCats = formValue.selectedCategories || [];
        selectedCats.forEach((catName: string) => {
          const localIndex = this.categories.indexOf(catName);
          const simulatedCategoryId = localIndex !== -1 ? localIndex + 1 : 1;
          requests.push(
            this.annotationService['http'].post(`${environment.apiUrl}/annotation-categories`, {
              id_annotation: idAnnotation,
              id_category: simulatedCategoryId
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
        
        const categoriesMapped = (formValue.selectedCategories || []).map((name: string) => ({ name }));
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
          const metadata = {
            categories: categoriesMapped,
            entities_text: entityString,
            evidences: []
          };
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