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
import { httpsCallable, Functions } from '@angular/fire/functions';

import { Partido } from '../../interfaces/Partido.interface';
import { NotificacionesService } from '../../services/notificaciones.service';
import { ModalBorrarPartidoComponent } from '../modal-borrar-partido/modal-borrar-partido.component';

type EstadoPartidoVista = 'pending' | 'progress' | 'finished';
type BannerTipo = 'inicio' | 'fin';

interface BannerActivo {
  tipo: BannerTipo;
  until: number;
}

interface CancelarPartidoResponse {
  success: boolean;
  refundStatus?: string;
}

interface FirebaseCallableError {
  code?: string;
  message?: string;
  details?: unknown;
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
  private readonly functions = inject(Functions);
  private readonly notificaciones = inject(NotificacionesService);

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
    this._matches = (value ?? []).filter((match) => !this.estaCancelado(match));

    this.recalcularBanners();
    this.activeMatchIndex = 0;

    const carousel = this.matchesCarousel?.nativeElement;

    if (carousel) {
      carousel.scrollTo({
        left: 0,
        behavior: 'auto',
      });
    }
  }

  get matches(): PartidoCarrusel[] {
    return this._matches;
  }

  get matchesVisibles(): PartidoCarrusel[] {
    return this._matches.filter(
      (match) => !this.estaCancelado(match) && !this.isFinished(match),
    );
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

  private estaCancelado(match: PartidoCarrusel): boolean {
    const estado = String(match.estado ?? '')
      .trim()
      .toLowerCase();

    return estado === 'cancelado' || estado === 'cancelada';
  }

  private eliminarDelCarrusel(partidoId: string): void {
    this._matches = this._matches.filter(
      (match) => match.partidoId !== partidoId,
    );

    this.banners.delete(partidoId);

    const timer = this.timers.get(partidoId);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(partidoId);
    }

    this.activeMatchIndex = Math.min(
      this.activeMatchIndex,
      Math.max(this.matchesVisibles.length - 1, 0),
    );
  }

  private recalcularBanners(): void {
    const now = Date.now();

    for (const match of this._matches) {
      if (this.estaCancelado(match)) {
        this.banners.delete(match.partidoId);

        const timer = this.timers.get(match.partidoId);

        if (timer) {
          clearTimeout(timer);
          this.timers.delete(match.partidoId);
        }

        continue;
      }

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
      const bannerActual = this.banners.get(partidoId);

      if (bannerActual?.tipo === tipo) {
        this.banners.delete(partidoId);
      }

      this.timers.delete(partidoId);
    }, duracionMs);

    this.timers.set(partidoId, timer);
  }

  esBannerInicio(match: PartidoCarrusel): boolean {
    if (this.estaCancelado(match)) {
      return false;
    }

    const banner = this.banners.get(match.partidoId);

    return banner?.tipo === 'inicio' && Date.now() < banner.until;
  }

  esBannerFin(match: PartidoCarrusel): boolean {
    if (this.estaCancelado(match)) {
      return false;
    }

    const banner = this.banners.get(match.partidoId);

    return banner?.tipo === 'fin' && Date.now() < banner.until;
  }

  onCarouselScroll(): void {
    const carousel = this.matchesCarousel?.nativeElement;

    if (!carousel || carousel.clientWidth === 0) {
      return;
    }

    const slideWidth = carousel.clientWidth;
    const nextIndex = Math.round(carousel.scrollLeft / slideWidth);

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
    if (this.estaCancelado(match)) {
      return 'Cancelado';
    }

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
    return (
      !this.estaCancelado(match) && this.getEstadoClase(match) === 'pending'
    );
  }

  isFinished(match: PartidoCarrusel): boolean {
    return (
      !this.estaCancelado(match) &&
      this.getEstadoClase(match) === 'finished' &&
      !this.esBannerFin(match)
    );
  }

  puedeBorrar(match: PartidoCarrusel): boolean {
    const esOrganizador =
      !!this.currentUserUid && match.organizadorId === this.currentUserUid;

    const inicio = match.fecha?.toDate?.();

    if (
      this.estaCancelado(match) ||
      !esOrganizador ||
      !inicio ||
      !this.isPending(match)
    ) {
      return false;
    }

    const milisegundosHastaInicio = inicio.getTime() - Date.now();
    const veinticuatroHorasMs = 24 * 60 * 60 * 1000;

    return milisegundosHastaInicio > veinticuatroHorasMs;
  }

  openDeleteModal(match: PartidoCarrusel): void {
    if (
      !match.partidoId ||
      this.deletingMatchId ||
      this.estaCancelado(match) ||
      !this.puedeBorrar(match)
    ) {
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

    if (
      !match?.partidoId ||
      this.deletingMatchId ||
      this.estaCancelado(match) ||
      !this.puedeBorrar(match)
    ) {
      return;
    }

    try {
      this.deletingMatchId = match.partidoId;

      const cancelarPartido = httpsCallable<
        { partidoId: string },
        CancelarPartidoResponse
      >(this.functions, 'cancelarPartido');

      const resultado = await cancelarPartido({
        partidoId: match.partidoId,
      });

      if (!resultado.data.success) {
        throw new Error('No se pudo cancelar el partido.');
      }

      await this.notificaciones.notificarPartidoCanceladoOrganizador(match);

      this.eliminarDelCarrusel(match.partidoId);
      this.isDeleteModalOpen = false;
      this.selectedMatchToDelete = null;
    } catch (error: unknown) {
      console.error('[CARRUSEL] Error al cancelar el partido:', error);

      const firebaseError = error as FirebaseCallableError;
      const mensaje = firebaseError.message ?? 'Error desconocido.';
      const mensajeNormalizado = mensaje.toLowerCase();

      const yaEstaCancelado =
        firebaseError.code === 'already-exists' ||
        mensajeNormalizado.includes('ya está cancelado') ||
        mensajeNormalizado.includes('ya esta cancelado');

      if (yaEstaCancelado) {
        await this.notificaciones.notificarPartidoCanceladoOrganizador(match);

        this.eliminarDelCarrusel(match.partidoId);
        this.isDeleteModalOpen = false;
        this.selectedMatchToDelete = null;
        return;
      }

      window.alert(`No se pudo cancelar el partido.\n\n${mensaje}`);
    } finally {
      this.deletingMatchId = null;
    }
  }
}
