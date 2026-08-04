import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Firestore, deleteDoc, doc } from '@angular/fire/firestore';
import { Partido } from '../../interfaces/Partido.interface';
import { ModalBorrarPartidoComponent } from '../modal-borrar-partido/modal-borrar-partido.component';

type EstadoPartidoVista = 'pending' | 'progress' | 'finished';

type BannerTipo = 'inicio' | 'fin';

interface BannerActivo {
  tipo: BannerTipo;
  until: number;
}

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
export class CarruselComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private _matches: PartidoCarrusel[] = [];
  private refreshTimer?: ReturnType<typeof setInterval>;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private banners = new Map<string, BannerActivo>();

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
    this.recalcularBanners();

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

  ngOnInit(): void {
    this.refreshTimer = setInterval(() => {
      this.recalcularBanners();
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }

    this.timers.clear();
    this.banners.clear();
  }

  private recalcularBanners(): void {
    const now = Date.now();

    for (const match of this._matches) {
      const inicio = match.fecha?.toDate?.();
      if (!inicio) {
        continue;
      }

      const start = inicio.getTime();
      const end = start + (match.duracionMinutos ?? 0) * 60_000;

      if (now >= start && now < start + 20_000) {
        this.activarBanner(match.partidoId, 'inicio', start + 20_000 - now);
        continue;
      }

      if (now >= end && now < end + 20_000) {
        this.activarBanner(match.partidoId, 'fin', end + 20_000 - now);
        continue;
      }

      if (now >= end + 20_000) {
        this.banners.delete(match.partidoId);
      }
    }
  }

  private activarBanner(
    partidoId: string,
    tipo: BannerTipo,
    duracionMs: number,
  ): void {
    const actual = this.banners.get(partidoId);

    if (actual?.tipo === tipo && actual.until > Date.now()) {
      return;
    }

    this.banners.set(partidoId, {
      tipo,
      until: Date.now() + duracionMs,
    });

    const timerPrevio = this.timers.get(partidoId);
    if (timerPrevio) {
      clearTimeout(timerPrevio);
    }

    const timer = setTimeout(() => {
      const current = this.banners.get(partidoId);
      if (current?.tipo === tipo) {
        this.banners.delete(partidoId);
      }
      this.timers.delete(partidoId);
    }, duracionMs);

    this.timers.set(partidoId, timer);
  }

  esBannerInicio(match: PartidoCarrusel): boolean {
    const banner = this.banners.get(match.partidoId);
    return banner?.tipo === 'inicio' && Date.now() < banner.until;
  }

  esBannerFin(match: PartidoCarrusel): boolean {
    const banner = this.banners.get(match.partidoId);
    return banner?.tipo === 'fin' && Date.now() < banner.until;
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
    const inicio = match.fecha?.toDate?.();

    if (!inicio) {
      return match.estadoClase ?? 'pending';
    }

    const ahora = new Date();
    const fin = new Date(
      inicio.getTime() + (match.duracionMinutos ?? 0) * 60_000,
    );

    if (ahora < inicio) {
      return 'pending';
    }

    if (ahora >= inicio && ahora < fin) {
      return 'progress';
    }

    return 'finished';
  }

  getEstadoTexto(match: PartidoCarrusel): string {
    const estado = this.getEstadoClase(match);

    if (estado === 'progress') {
      return 'En juego';
    }

    if (estado === 'finished') {
      return 'Finalizado';
    }

    return 'Pendiente';
  }

  isPending(match: PartidoCarrusel): boolean {
    return this.getEstadoClase(match) === 'pending';
  }

  isFinished(match: PartidoCarrusel): boolean {
    return (
      this.getEstadoClase(match) === 'finished' && !this.esBannerFin(match)
    );
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
