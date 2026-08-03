import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Partido } from '../../interfaces/Partido.interface';

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
  imports: [CommonModule, RouterLink],
})
export class CarruselComponent {
  private _matches: PartidoCarrusel[] = [];

  @ViewChild('matchesCarousel')
  matchesCarousel?: ElementRef<HTMLDivElement>;

  activeMatchIndex = 0;

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

  onCarouselScroll(): void {
    const el = this.matchesCarousel?.nativeElement;

    if (!el || el.clientWidth === 0) {
      return;
    }

    const slideWidth = el.clientWidth;
    const nextIndex = Math.round(el.scrollLeft / slideWidth);

    this.activeMatchIndex = Math.min(
      Math.max(nextIndex, 0),
      Math.max(this.matches.length - 1, 0),
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

  shouldShowStatusBadge(match: PartidoCarrusel): boolean {
    const estado = this.getEstadoClase(match);
    return (
      estado === 'pending' || estado === 'progress' || estado === 'finished'
    );
  }

  getEstadoBadgeTexto(match: PartidoCarrusel): string {
    const estado = this.getEstadoClase(match);

    if (estado === 'progress') {
      return 'En juego';
    }

    if (estado === 'finished') {
      return 'Finalizado';
    }

    return 'Pendiente';
  }
}
