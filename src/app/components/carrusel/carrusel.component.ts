import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Firestore, deleteDoc, doc } from '@angular/fire/firestore';
import { Partido } from '../../interfaces/Partido.interface';
import { ModalBorrarPartidoComponent } from '../modal-borrar-partido/modal-borrar-partido.component';

type EstadoPartidoVista = 'pending' | 'progress' | 'finished';

export interface PartidoCarrusel extends Partido {
  estadoClase?: EstadoPartidoVista;
  estadoTexto?: string;
}

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, ModalBorrarPartidoComponent],
})
export class CarruselComponent {
  private firestore = inject(Firestore);
  private _matches: PartidoCarrusel[] = [];

  @ViewChild('matchesCarousel')
  matchesCarousel?: ElementRef<HTMLDivElement>;

  @Input() currentUserUid: string | null = null;

  activeMatchIndex = 0;
  deletingMatchId: string | null = null;
  selectedMatchToDelete: PartidoCarrusel | null = null;
  isDeleteModalOpen = false;

  @Input({ required: true })
  set matches(value: PartidoCarrusel[] | null | undefined) {
    this._matches = value ?? [];
    this.activeMatchIndex = 0;

    const el = this.matchesCarousel?.nativeElement;
    if (el) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
  }

  get matches(): PartidoCarrusel[] {
    return this._matches;
  }

  get matchesVisibles(): PartidoCarrusel[] {
    return this._matches.filter((match) => !this.isFinished(match));
  }

  onCarouselScroll(): void {
    const el = this.matchesCarousel?.nativeElement;

    if (!el || el.clientWidth === 0) {
      return;
    }

    const slideWidth = el.clientWidth;
    const nextIndex = Math.round(el.scrollLeft / slideWidth);

    this.activeMatchIndex = Math.min(
      Math.max(nextIndex, 0),
      Math.max(this.matchesVisibles.length - 1, 0),
    );
  }

  trackByPartidoId(index: number, match: PartidoCarrusel): string {
    return match.partidoId || String(index);
  }

  getEstadoClase(match: PartidoCarrusel): EstadoPartidoVista {
    if (match.estadoClase) {
      return match.estadoClase;
    }

    if (match.estado === 'en progreso') {
      return 'progress';
    }

    if (match.estado === 'finalizado') {
      return 'finished';
    }

    return 'pending';
  }

  isPending(match: PartidoCarrusel): boolean {
    const estado = (match.estado ?? '').toLowerCase().trim();
    return estado === 'pendiente' || this.getEstadoClase(match) === 'pending';
  }

  isFinished(match: PartidoCarrusel): boolean {
    const estado = (match.estado ?? '').toLowerCase().trim();

    return [
      'finished',
      'finalizado',
      'terminado',
      'completado',
      'cerrado',
      'acabado',
    ].includes(estado);
  }

  puedeBorrar(match: PartidoCarrusel): boolean {
    const esOrganizador =
      !!this.currentUserUid && match.organizadorId === this.currentUserUid;
    return esOrganizador && this.isPending(match);
  }

  openDeleteModal(match: PartidoCarrusel): void {
    if (!match.partidoId || this.deletingMatchId || !this.puedeBorrar(match)) {
      return;
    }

    this.selectedMatchToDelete = match;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal(): void {
    if (this.deletingMatchId) {
      return;
    }

    this.isDeleteModalOpen = false;
    this.selectedMatchToDelete = null;
  }

  async confirmDeleteMatch(): Promise<void> {
    const match = this.selectedMatchToDelete;

    if (!match?.partidoId || this.deletingMatchId || !this.puedeBorrar(match)) {
      return;
    }

    try {
      this.deletingMatchId = match.partidoId;

      const partidoRef = doc(this.firestore, `partidos/${match.partidoId}`);
      await deleteDoc(partidoRef);

      this.isDeleteModalOpen = false;
      this.selectedMatchToDelete = null;
    } catch (error) {
      console.error('[CARRUSEL] Error al cancelar el partido:', error);
    } finally {
      this.deletingMatchId = null;
    }
  }
}
