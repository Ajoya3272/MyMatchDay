import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';

export interface PartidoHome {
  partidoId: string;
  nombre: string;
  equipoA: string;
  equipoB: string;
  fecha: Timestamp;
  estado: string;
  organizador: string;
  organizadorId: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;
  ubicacion?: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent],
})
export class HomeComponent {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  @ViewChild('matchesCarousel')
  matchesCarousel?: ElementRef<HTMLDivElement>;

  activeMatchIndex = 0;

  userMatches$: Observable<PartidoHome[]> = authState(this.auth).pipe(
    tap((user) => {
      console.log('[HOME] Usuario autenticado:', user);
    }),
    switchMap((user) => {
      if (!user) {
        console.log('[HOME] No hay usuario autenticado');
        return of([]);
      }

      console.log('[HOME] UID para recoger partidos:', user.uid);

      const partidosRef = collection(this.firestore, 'partidos');
      const partidosQuery = query(
        partidosRef,
        where('organizadorId', '==', user.uid),
      );

      return collectionData(partidosQuery, {
        idField: 'partidoId',
      }).pipe(
        map((partidos) => partidos as PartidoHome[]),
        tap((partidos) => {
          console.log('[HOME] Partidos del usuario logueado:', partidos);
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  pendingMatches$: Observable<PartidoHome[]> = this.userMatches$.pipe(
    map((partidos) => {
      const now = new Date();

      return partidos
        .filter((partido) => {
          const fechaPartido = partido.fecha?.toDate?.();
          return (
            !!fechaPartido &&
            fechaPartido >= now &&
            partido.estado !== 'finalizado'
          );
        })
        .sort((a, b) => {
          return a.fecha.toDate().getTime() - b.fecha.toDate().getTime();
        });
    }),
    tap((partidos) => {
      console.log('[HOME] Partidos pendientes:', partidos);
      this.activeMatchIndex = 0;
    }),
  );

  onCarouselScroll(): void {
    const el = this.matchesCarousel?.nativeElement;
    if (!el || el.clientWidth === 0) {
      return;
    }

    const slideWidth = el.clientWidth;
    this.activeMatchIndex = Math.round(el.scrollLeft / slideWidth);
  }
}
