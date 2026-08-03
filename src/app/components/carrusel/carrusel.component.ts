import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Partido } from '../../interfaces/Partido.interface';

@Component({
  selector: 'app-carrusel',
  templateUrl: './carrusel.component.html',
  styleUrls: ['./carrusel.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class CarruselComponent {
  private _matches: Partido[] = [];

  @ViewChild('matchesCarousel')
  matchesCarousel?: ElementRef<HTMLDivElement>;

  activeMatchIndex = 0;

  @Input({ required: true })
  set matches(value: Partido[] | null | undefined) {
    this._matches = value ?? [];
    this.activeMatchIndex = 0;

    const el = this.matchesCarousel?.nativeElement;
    if (el) {
      el.scrollTo({ left: 0, behavior: 'auto' });
    }
  }

  get matches(): Partido[] {
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

  trackByPartidoId(index: number, match: Partido): string {
    return match.partidoId || String(index);
  }
}
