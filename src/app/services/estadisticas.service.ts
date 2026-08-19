import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EstadisticaJugador {
  partidoId: string;
  resultadoId: string;
  jugadorId: string;
  nombreJugador: string;
  equipo: 'A' | 'B';
  goles: number;
  asistencias: number;
  minutosJugados: number;
  victoria: boolean;
  empate: boolean;
  derrota: boolean;
  golesEquipoA: number;
  golesEquipoB: number;
  fechaPartido?: Timestamp;
  fechaCreacion?: Timestamp;
  fechaActualizacion?: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class EstadisticasService {
  private firestore = inject(Firestore);

  obtenerEstadisticasJugador(
    jugadorId: string,
  ): Observable<EstadisticaJugador[]> {
    if (!jugadorId?.trim()) {
      return new Observable((subscriber) => {
        subscriber.next([]);
        subscriber.complete();
      });
    }

    const estadisticasRef = collection(
      this.firestore,
      `usuarios/${jugadorId}/estadisticas`,
    );

    const estadisticasQuery = query(
      estadisticasRef,
      orderBy('fechaPartido', 'desc'),
    );

    return collectionData(estadisticasQuery).pipe(
      map((estadisticas) => estadisticas as EstadisticaJugador[]),
    );
  }

  obtenerEstadisticasDePartido(
    partidoId: string,
  ): Observable<EstadisticaJugador[]> {
    const estadisticasRef = collection(
      this.firestore,
      `partidos/${partidoId}/estadisticas`,
    );

    const estadisticasQuery = query(
      estadisticasRef,
      where('partidoId', '==', partidoId),
      orderBy('fechaCreacion', 'desc'),
    );

    return collectionData(estadisticasQuery).pipe(
      map((estadisticas) => estadisticas as EstadisticaJugador[]),
    );
  }
}
