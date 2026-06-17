import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as L from 'leaflet';

import { AnnotationService } from '../../services/annotation/annotation.service';
import { AnnotationCategoryService } from '../../services/annotation-category/annotation-category.service';
import { CategoryService } from '../../services/category/category.service';
import { CommuneService } from '../../services/commune/commune.service';
import { EvidenceService } from '../../services/evidence/evidence.service';
import { NeighborhoodService } from '../../services/neighborhood/neighborhood.service';
import { VoteService } from '../../services/vote/vote.service';
import { Annotation } from '../../models/Annotation';
import { Category } from '../../models/Category';
import { Commune } from '../../models/Commune';
import { Neighborhood } from '../../models/Neighborhood';

type CategoryNode = Category & {
  id: number;
  parentId: number | null;
  markerClass: string;
  count: number;
  expanded: boolean;
  children: CategoryNode[];
};

type MapAnnotation = Annotation & {
  id_annotation: number;
  categoryIds: number[];
  categoryNames: string[];
  subcategoryNames: string[];
  evidenceUrls: string[];
  averageRating: number | null;
  voteCount: number;
  neighborhoodName: string;
  communeName: string;
  id_commune?: number;
  createdAt?: string;
};

@Component({
  selector: 'app-territorial-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './territorial-map.component.html',
  styleUrls: ['./territorial-map.component.css']
})
export class TerritorialMapComponent implements OnInit, AfterViewInit, OnDestroy {
  annotations: MapAnnotation[] = [];
  filteredAnnotations: MapAnnotation[] = [];
  categoryTree: CategoryNode[] = [];
  communes: Commune[] = [];
  neighborhoods: Neighborhood[] = [];
  filteredNeighborhoods: Neighborhood[] = [];

  selectedCategoryIds = new Set<number>();
  selectedSubcategoryIds = new Set<number>();
  selectedCommuneId: number | null = null;
  selectedNeighborhoodId: number | null = null;

  loading = true;
  errorMessage = '';

  private map: L.Map | null = null;
  private markers: L.Marker[] = [];
  private sub = new Subscription();
  private readonly markerClassNames = [
    'territorial-marker--blue',
    'territorial-marker--green',
    'territorial-marker--red',
    'territorial-marker--purple',
    'territorial-marker--orange',
    'territorial-marker--cyan',
    'territorial-marker--indigo',
    'territorial-marker--rose'
  ];

  constructor(
    private annotationService: AnnotationService,
    private annotationCategoryService: AnnotationCategoryService,
    private categoryService: CategoryService,
    private communeService: CommuneService,
    private evidenceService: EvidenceService,
    private neighborhoodService: NeighborhoodService,
    private voteService: VoteService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';

    this.sub.add(
      forkJoin({
        annotations: this.annotationService.getAll().pipe(catchError(() => of([]))),
        categories: this.categoryService.getAll().pipe(catchError(() => of([]))),
        annotationCategories: this.annotationCategoryService.getAll().pipe(catchError(() => of([]))),
        evidences: this.evidenceService.getAll().pipe(catchError(() => of([]))),
        votes: this.voteService.getAll().pipe(catchError(() => of([]))),
        neighborhoods: this.neighborhoodService.getAll().pipe(catchError(() => of([]))),
        communes: this.communeService.getAll().pipe(catchError(() => of([])))
      }).subscribe({
        next: (data) => {
          const categories = this.toArray<Category>(data.categories);
          this.communes = this.toArray<Commune>(data.communes);
          this.neighborhoods = this.toArray<Neighborhood>(data.neighborhoods);
          this.filteredNeighborhoods = [...this.neighborhoods];
          this.categoryTree = this.buildCategoryTree(categories);
          this.annotations = this.enrichAnnotations(
            this.toArray<Annotation>(data.annotations),
            categories,
            this.toArray(data.annotationCategories),
            this.toArray(data.evidences),
            this.toArray(data.votes)
          );
          this.applyFilters();
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'No fue posible cargar las anotaciones del mapa territorial.';
        }
      })
    );
  }

  toggleCategory(node: CategoryNode): void {
    if (this.selectedCategoryIds.has(node.id)) {
      this.selectedCategoryIds.delete(node.id);
    } else {
      this.selectedCategoryIds.add(node.id);
    }
    this.applyFilters();
  }

  toggleSubcategory(node: CategoryNode): void {
    if (this.selectedSubcategoryIds.has(node.id)) {
      this.selectedSubcategoryIds.delete(node.id);
    } else {
      this.selectedSubcategoryIds.add(node.id);
    }
    this.applyFilters();
  }

  toggleExpanded(node: CategoryNode): void {
    node.expanded = !node.expanded;
  }

  onCommuneChange(): void {
    this.selectedNeighborhoodId = null;
    this.filteredNeighborhoods = this.selectedCommuneId
      ? this.neighborhoods.filter(n => Number(n.id_commune) === Number(this.selectedCommuneId))
      : [...this.neighborhoods];
    this.applyFilters();
  }

  applyFilters(): void {
    const selectedParents = Array.from(this.selectedCategoryIds);
    const selectedChildren = Array.from(this.selectedSubcategoryIds);
    const parentDescendants = new Set<number>();

    selectedParents.forEach(id => {
      parentDescendants.add(id);
      this.findNode(id)?.children.forEach(child => parentDescendants.add(child.id));
    });

    this.filteredAnnotations = this.annotations.filter(annotation => {
      const categoryMatch =
        selectedParents.length === 0 && selectedChildren.length === 0
          ? true
          : annotation.categoryIds.some(id => parentDescendants.has(id) || selectedChildren.includes(id));

      const communeMatch = this.selectedCommuneId ? Number(annotation.id_commune) === Number(this.selectedCommuneId) : true;
      const neighborhoodMatch = this.selectedNeighborhoodId
        ? Number(annotation.id_neighborhood) === Number(this.selectedNeighborhoodId)
        : true;

      return categoryMatch && communeMatch && neighborhoodMatch;
    });

    this.renderMarkers();
  }

  clearFilters(): void {
    this.selectedCategoryIds.clear();
    this.selectedSubcategoryIds.clear();
    this.selectedCommuneId = null;
    this.selectedNeighborhoodId = null;
    this.filteredNeighborhoods = [...this.neighborhoods];
    this.applyFilters();
  }

  isCategorySelected(id: number): boolean {
    return this.selectedCategoryIds.has(id);
  }

  isSubcategorySelected(id: number): boolean {
    return this.selectedSubcategoryIds.has(id);
  }

  get activeFilterCount(): number {
    return this.selectedCategoryIds.size + this.selectedSubcategoryIds.size + (this.selectedCommuneId ? 1 : 0) + (this.selectedNeighborhoodId ? 1 : 0);
  }

  private initMap(): void {
    if (this.map) return;

    this.map = L.map('territorial-map-canvas', {
      center: [5.06889, -75.51738],
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.map.whenReady(() => {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.renderMarkers();
      }, 200);
    });
  }

  private renderMarkers(): void {
    if (!this.map) return;

    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    this.filteredAnnotations.forEach(annotation => {
      if (!Number.isFinite(Number(annotation.latitude)) || !Number.isFinite(Number(annotation.longitude))) return;

      const markerClass = this.getAnnotationMarkerClass(annotation);
      const marker = L.marker([Number(annotation.latitude), Number(annotation.longitude)], {
        icon: L.divIcon({
          className: `territorial-marker ${markerClass}`,
          html: '<span></span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        })
      }).addTo(this.map!).bindPopup(this.buildPopup(annotation, markerClass), { maxWidth: 320 });

      this.markers.push(marker);
    });

    if (this.markers.length > 0) {
      const group = L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 15 });
    }
  }

  private buildCategoryTree(categories: Category[]): CategoryNode[] {
    const nodes = categories
      .map((category, index) => {
        const id = Number(category.id || (category as any).id_category);
        return {
          ...category,
          id,
          parentId: this.normalizeParentId(category.id_parent_category),
          markerClass: this.markerClassNames[index % this.markerClassNames.length],
          count: 0,
          expanded: true,
          children: []
        } as CategoryNode;
      })
      .filter(node => Number.isFinite(node.id));

    const byId = new Map(nodes.map(node => [node.id, node]));
    const roots: CategoryNode[] = [];

    nodes.forEach(node => {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }

  private enrichAnnotations(
    annotations: Annotation[],
    categories: Category[],
    annotationCategories: any[],
    evidences: any[],
    votes: any[]
  ): MapAnnotation[] {
    const localCache = this.readLocalMetadata();
    const categoriesById = new Map(categories.map(category => [Number(category.id || (category as any).id_category), category]));
    const categoriesByName = new Map(categories.map(category => [this.cleanText(category.name).toLowerCase(), category]));
    const neighborhoodsById = new Map(this.neighborhoods.map(n => [Number(n.id_neighborhood), n]));
    const communesById = new Map(this.communes.map(c => [Number(c.id_commune), c]));

    const enriched = annotations
      .map((annotation: any) => {
        const id = Number(annotation.id_annotation || annotation.id);
        if (!Number.isFinite(id)) return null;

        const local = localCache[id] || {};
        const linkedCategoryIds = annotationCategories
          .filter(link => Number(link.id_annotation) === id)
          .map(link => Number(link.id_category))
          .filter(Number.isFinite);

        const inlineCategoryIds = this.toArray<any>(annotation.categories)
          .map(category => Number(category.id || category.id_category))
          .filter(Number.isFinite);

        const localCategoryIds = this.toArray<any>(local.categories)
          .map(category => categoriesByName.get(this.cleanText(category.name).toLowerCase()))
          .filter(Boolean)
          .map(category => Number((category as Category).id || (category as any).id_category));

        const categoryIds = Array.from(new Set([...linkedCategoryIds, ...inlineCategoryIds, ...localCategoryIds]));
        const categoryNames = categoryIds
          .map(categoryId => categoriesById.get(categoryId)?.name)
          .filter(Boolean) as string[];
        const subcategoryNames = categoryIds
          .map(categoryId => categoriesById.get(categoryId))
          .filter(category => category && this.normalizeParentId(category.id_parent_category))
          .map(category => category!.name);

        const annotationEvidences = [
          ...evidences.filter(evidence => Number(evidence.id_annotation) === id),
          ...this.toArray<any>(annotation.evidences),
          ...this.toArray<any>(local.evidences)
        ];

        const annotationVotes = votes.filter(vote => Number(vote.id_annotation) === id);
        const validVotes = annotationVotes.map(vote => Number(vote.stars || vote.rating)).filter(Number.isFinite);
        const averageRating = validVotes.length
          ? validVotes.reduce((sum, vote) => sum + vote, 0) / validVotes.length
          : null;
        const neighborhood = neighborhoodsById.get(Number(annotation.id_neighborhood));
        const commune = neighborhood ? communesById.get(Number(neighborhood.id_commune)) : undefined;

        return {
          ...annotation,
          id_annotation: id,
          latitude: Number(annotation.latitude),
          longitude: Number(annotation.longitude),
          categoryIds,
          categoryNames: categoryNames.length ? categoryNames : this.toArray<any>(local.categories).map(c => c.name).filter(Boolean),
          subcategoryNames,
          evidenceUrls: annotationEvidences.map(evidence => this.resolveEvidenceUrl(evidence)).filter(Boolean),
          averageRating,
          voteCount: validVotes.length,
          neighborhoodName: neighborhood?.name || 'Sin barrio',
          communeName: commune?.name || 'Sin comuna',
          id_commune: commune?.id_commune,
          createdAt: annotation.created_at || annotation.createdAt || annotation.updated_at
        } as MapAnnotation;
      })
      .filter(Boolean) as MapAnnotation[];

    this.updateCategoryCounts(enriched);
    return enriched;
  }

  private updateCategoryCounts(annotations: MapAnnotation[]): void {
    const countById = new Map<number, number>();
    annotations.forEach(annotation => {
      annotation.categoryIds.forEach(id => countById.set(id, (countById.get(id) || 0) + 1));
    });

    const assignCounts = (node: CategoryNode): number => {
      const own = countById.get(node.id) || 0;
      const children = node.children.reduce((total, child) => total + assignCounts(child), 0);
      node.count = own + children;
      return node.count;
    };

    this.categoryTree.forEach(assignCounts);
  }

  private buildPopup(annotation: MapAnnotation, markerClass: string): string {
    const categories = annotation.categoryNames.length ? annotation.categoryNames.join(', ') : 'Sin categoria';
    const subcategories = annotation.subcategoryNames.length ? annotation.subcategoryNames.join(', ') : 'Sin subcategoria';
    const rating = annotation.averageRating ? `${annotation.averageRating.toFixed(1)} / 5 (${annotation.voteCount})` : 'Sin calificaciones';
    const evidence = annotation.evidenceUrls[0]
      ? `<img src="${annotation.evidenceUrls[0]}" alt="Evidencia" class="territorial-popup-image">`
      : `<div class="territorial-popup-empty">Sin evidencia fotografica</div>`;

    return `
      <div class="territorial-popup">
        <div class="territorial-popup-header">
          <span class="${markerClass}"></span>
          <strong>${this.escapeHtml(annotation.status || 'Registrada')}</strong>
        </div>
        <p>${this.escapeHtml(annotation.description || 'Sin descripcion')}</p>
        <dl>
          <dt>Categoria</dt><dd>${this.escapeHtml(categories)}</dd>
          <dt>Subcategoria</dt><dd>${this.escapeHtml(subcategories)}</dd>
          <dt>Territorio</dt><dd>${this.escapeHtml(`${annotation.communeName} / ${annotation.neighborhoodName}`)}</dd>
          <dt>Calificacion</dt><dd>${this.escapeHtml(rating)}</dd>
          <dt>Fecha</dt><dd>${this.escapeHtml(this.formatDate(annotation.createdAt))}</dd>
        </dl>
        ${evidence}
      </div>
    `;
  }

  private getAnnotationMarkerClass(annotation: MapAnnotation): string {
    const firstCategory = annotation.categoryIds[0];
    const node = firstCategory ? this.findNode(firstCategory) : null;
    if (node) return node.markerClass;

    const parent = this.categoryTree.find(root => annotation.categoryNames.includes(root.name));
    return parent?.markerClass || 'territorial-marker--default';
  }

  private findNode(id: number): CategoryNode | null {
    const stack = [...this.categoryTree];
    while (stack.length) {
      const current = stack.shift()!;
      if (current.id === id) return current;
      stack.push(...current.children);
    }
    return null;
  }

  private normalizeParentId(value: unknown): number | null {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private toArray<T>(value: any): T[] {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    if (Array.isArray(value?.results)) return value.results;
    if (Array.isArray(value?.items)) return value.items;
    if (Array.isArray(value?.rows)) return value.rows;
    return [];
  }

  private readLocalMetadata(): Record<string, any> {
    try {
      return JSON.parse(localStorage.getItem('annotations_metadata') || '{}');
    } catch {
      return {};
    }
  }

  private resolveEvidenceUrl(evidence: any): string {
    if (!evidence) return '';
    if (evidence.dataUrl) return evidence.dataUrl;
    if (evidence.file_url?.startsWith('http')) return evidence.file_url;
    if (evidence.file_url) return `http://127.0.0.1:5000/static/uploads/${evidence.file_url}`;
    return '';
  }

  private formatDate(value: string | undefined): string {
    if (!value) return 'Sin fecha';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CO');
  }

  private cleanText(value: unknown): string {
    return String(value || '').trim();
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
