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
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { CarruselComponent } from '../carrusel/carrusel.component';
import { Partido } from '../../interfaces/Partido.interface';

type EstadoPartido = 'pendiente' | 'en progreso' | 'finalizado';

export interface PartidoHomeView extends Partido {
  estadoCalculado: EstadoPartido;
  estadoTexto: string;
  estadoClase: 'pending' | 'progress' | 'finished';
}

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
    switchMap((user) => {
      if (!user) {
        return of([] as Partido[]);
      }

      const partidosRef = collection(this.firestore, 'partidos');
      const partidosQuery = query(
        partidosRef,
        where('organizadorId', '==', user.uid),
      );

      return collectionData(partidosQuery, {
        idField: 'partidoId',
      }).pipe(map((partidos) => partidos as Partido[]));
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  pendingMatches$: Observable<PartidoHomeView[]> = this.userMatches$.pipe(
    map((partidos) =>
      partidos
        .map((partido) => this.mapearPartidoHome(partido))
        .filter((partido) => this.debeMostrarEnCarrusel(partido))
        .sort((a, b) => this.ordenarPartidosCarrusel(a, b)),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private mapearPartidoHome(partido: Partido): PartidoHomeView {
    const estadoCalculado = this.calcularEstado(partido);

    return {
      ...partido,
      estadoCalculado,
      estadoTexto: this.obtenerTextoEstado(estadoCalculado),
      estadoClase: this.obtenerClaseEstado(estadoCalculado),
      estado: estadoCalculado,
    };
  }

  private calcularEstado(partido: Partido): EstadoPartido {
    const inicio = partido.fecha?.toDate?.();

    if (!inicio) {
      return 'pendiente';
    }

    const fin = new Date(inicio.getTime() + partido.duracionMinutos * 60_000);
    const ahora = new Date();

    if (ahora < inicio) {
      return 'pendiente';
    }

    if (ahora >= inicio && ahora < fin) {
      return 'en progreso';
    }

    return 'finalizado';
  }

  private debeMostrarEnCarrusel(partido: PartidoHomeView): boolean {
    const inicio = partido.fecha?.toDate?.();

    if (!inicio) {
      return false;
    }

    const fin = new Date(inicio.getTime() + partido.duracionMinutos * 60_000);
    const ahora = Date.now();
    const ventana24h = 24 * 60 * 60 * 1000;

    if (partido.estadoCalculado === 'pendiente') {
      return true;
    }

    if (partido.estadoCalculado === 'en progreso') {
      return true;
    }

    return ahora - fin.getTime() <= ventana24h;
  }

  private ordenarPartidosCarrusel(
    a: PartidoHomeView,
    b: PartidoHomeView,
  ): number {
    const prioridadEstado: Record<EstadoPartido, number> = {
      'en progreso': 0,
      pendiente: 1,
      finalizado: 2,
    };

    const diferenciaEstado =
      prioridadEstado[a.estadoCalculado] - prioridadEstado[b.estadoCalculado];

    if (diferenciaEstado !== 0) {
      return diferenciaEstado;
    }

    return a.fecha.toDate().getTime() - b.fecha.toDate().getTime();
  }

  private obtenerTextoEstado(estado: EstadoPartido): string {
    if (estado === 'en progreso') {
      return 'En juego';
    }

    if (estado === 'finalizado') {
      return 'Finalizado';
    }

    return 'Pendiente';
  }

  private obtenerClaseEstado(
    estado: EstadoPartido,
  ): 'pending' | 'progress' | 'finished' {
    if (estado === 'en progreso') {
      return 'progress';
    }

    if (estado === 'finalizado') {
      return 'finished';
    }

    return 'pending';
  }
}
