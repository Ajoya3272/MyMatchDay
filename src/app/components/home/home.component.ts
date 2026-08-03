import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { CarruselComponent } from '../carrusel/carrusel.component';
import { Partido } from '../../interfaces/Partido.interface';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, CarruselComponent],
})
export class HomeComponent {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  userMatches$: Observable<Partido[]> = authState(this.auth).pipe(
    tap((user) => {
      console.log('[HOME] Usuario autenticado:', user);
    }),
    switchMap((user) => {
      if (!user) {
        console.log('[HOME] No hay usuario autenticado');
        return of([] as Partido[]);
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
        map((partidos) => partidos as Partido[]),
        tap((partidos) => {
          console.log('[HOME] Partidos del usuario logueado:', partidos);
        }),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  pendingMatches$: Observable<Partido[]> = this.userMatches$.pipe(
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
        .sort(
          (a, b) => a.fecha.toDate().getTime() - b.fecha.toDate().getTime(),
        );
    }),
    tap((partidos) => {
      console.log('[HOME] Partidos pendientes:', partidos);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
}
