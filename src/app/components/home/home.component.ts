import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  collectionGroup,
  doc,
  docData,
  limit,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { CarruselComponent } from '../carrusel/carrusel.component';
import { Partido } from '../../interfaces/Partido.interface';
import {
  ActividadItemView,
  EstadisticaConFechaDoc,
  EstadisticaJugadorPartidoDoc,
  EstadisticasUsuarioView,
  EstadoPartido,
  PartidoHomeView,
} from '../../interfaces/EstadisticasJugador.interface';

const VENTANA_ACTIVIDAD_MS = 3 * 24 * 60 * 60 * 1000;
const VENTANA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

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

  uidUsuarioActual: string | null = null;

  userMatches$: Observable<Partido[]> = authState(this.auth).pipe(
    switchMap((user) => {
      this.uidUsuarioActual = user?.uid ?? null;

      if (!user) {
        return of([] as Partido[]);
      }

      const partidosRef = collection(this.firestore, 'partidos');

      const creadosQuery = query(
        partidosRef,
        where('organizadorId', '==', user.uid),
      );

      const unidosQuery = query(
        partidosRef,
        where('jugadoresId', 'array-contains', user.uid),
      );

      return combineLatest([
        collectionData(creadosQuery, { idField: 'partidoId' }),
        collectionData(unidosQuery, { idField: 'partidoId' }),
      ]).pipe(
        map(([creados, unidos]) => {
          const todos = [...(creados as Partido[]), ...(unidos as Partido[])];

          return todos.filter(
            (partido, index, array) =>
              array.findIndex((p) => p.partidoId === partido.partidoId) ===
              index,
          );
        }),
      );
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

  stats$: Observable<EstadisticasUsuarioView> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user) {
        return of(this.estadisticasVacias());
      }

      const resumenRef = doc(
        this.firestore,
        'usuarios',
        user.uid,
        'resumen',
        'estadisticas',
      );

      return docData(resumenRef).pipe(
        map((data) => this.normalizarEstadisticas(data)),
        catchError(() => of(this.estadisticasVacias())),
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private resultadoReciente$: Observable<ActividadItemView | null> =
    combineLatest([authState(this.auth), this.userMatches$]).pipe(
      switchMap(([user, partidos]) => {
        if (!user) {
          return of(null);
        }

        const finalizados = partidos
          .filter((partido) => partido.estado === 'finalizado')
          .sort(
            (a, b) => b.fecha.toDate().getTime() - a.fecha.toDate().getTime(),
          );

        const ultimo = finalizados[0];

        if (
          !ultimo ||
          !this.estaDentroDeVentana(ultimo, VENTANA_ACTIVIDAD_MS)
        ) {
          return of(null);
        }

        const statRef = doc(
          this.firestore,
          'partidos',
          ultimo.partidoId,
          'estadisticas',
          user.uid,
        );

        return docData(statRef).pipe(
          map((stat) =>
            this.construirActividadResultado(
              ultimo,
              stat as EstadisticaJugadorPartidoDoc,
            ),
          ),
        );
      }),
      catchError((error) => {
        console.error('[HOME] Error cargando resultado reciente:', error);
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private confirmacionReciente$: Observable<ActividadItemView | null> =
    this.userMatches$.pipe(
      map((partidos) => {
        const activos = partidos
          .filter((partido) => this.calcularEstado(partido) !== 'finalizado')
          .sort(
            (a, b) => a.fecha.toDate().getTime() - b.fecha.toDate().getTime(),
          );

        const proximo = activos[0];

        if (
          !proximo ||
          !this.estaDentroDeVentana(proximo, VENTANA_ACTIVIDAD_MS)
        ) {
          return null;
        }

        return this.construirActividadConfirmacion(proximo);
      }),
      catchError((error) => {
        console.error('[HOME] Error cargando confirmación reciente:', error);
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

  private golesSemana$: Observable<ActividadItemView | null> = authState(
    this.auth,
  ).pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }

      const estadisticasRef = collectionGroup(this.firestore, 'estadisticas');

      const estadisticasQuery = query(
        estadisticasRef,
        where('jugadorId', '==', user.uid),
        orderBy('fechaCreacion', 'desc'),
        limit(20),
      );

      return collectionData(estadisticasQuery).pipe(
        map((docs) =>
          this.construirActividadGolesSemana(docs as EstadisticaConFechaDoc[]),
        ),
      );
    }),
    catchError((error) => {
      console.error('[HOME] Error cargando goles de la semana:', error);
      return of(null);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  activityItems$: Observable<ActividadItemView[]> = combineLatest([
    this.resultadoReciente$,
    this.golesSemana$,
    this.confirmacionReciente$,
  ]).pipe(
    map(([resultado, golesSemana, confirmacion]) =>
      [resultado, golesSemana, confirmacion].filter(
        (item): item is ActividadItemView => item !== null,
      ),
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

  private normalizarEstadisticas(data: unknown): EstadisticasUsuarioView {
    const d = (data ?? {}) as Partial<EstadisticasUsuarioView>;

    return {
      partidosJugados: Number(d.partidosJugados) || 0,
      victorias: Number(d.victorias) || 0,
      goles: Number(d.goles) || 0,
      asistencias: Number(d.asistencias) || 0,
    };
  }

  private estadisticasVacias(): EstadisticasUsuarioView {
    return {
      partidosJugados: 0,
      victorias: 0,
      goles: 0,
      asistencias: 0,
    };
  }

  private getTituloPartido(partido: Partido): string {
    const nombre = (partido.nombre ?? '').trim();
    return nombre.length > 0
      ? nombre
      : `${partido.equipoA} vs ${partido.equipoB}`;
  }

  private estaDentroDeVentana(partido: Partido, ventanaMs: number): boolean {
    const referencia =
      (
        partido as unknown as { fechaActualizacion?: Timestamp }
      ).fechaActualizacion?.toDate?.() ?? partido.fecha?.toDate?.();

    if (!referencia) {
      return false;
    }

    return Date.now() - referencia.getTime() <= ventanaMs;
  }

  private construirActividadResultado(
    partido: Partido,
    stat: EstadisticaJugadorPartidoDoc | undefined,
  ): ActividadItemView | null {
    if (!stat || !stat.equipo) {
      return null;
    }

    const rival = stat.equipo === 'A' ? partido.equipoB : partido.equipoA;
    const golesFavor =
      Number(
        stat.equipo === 'A' ? partido.golesEquipoA : partido.golesEquipoB,
      ) || 0;
    const golesContra =
      Number(
        stat.equipo === 'A' ? partido.golesEquipoB : partido.golesEquipoA,
      ) || 0;

    let titulo: string;

    if (stat.victoria) {
      titulo = `Ganaste ${golesFavor}-${golesContra} contra ${rival}`;
    } else if (stat.empate) {
      titulo = `Empataste ${golesFavor}-${golesContra} contra ${rival}`;
    } else {
      titulo = `Perdiste ${golesFavor}-${golesContra} contra ${rival}`;
    }

    const goles = Number(stat.goles) || 0;
    const asistencias = Number(stat.asistencias) || 0;

    const texto = `Marcaste ${goles} gol${goles === 1 ? '' : 'es'} y diste ${asistencias} asistencia${asistencias === 1 ? '' : 's'}.`;

    return {
      id: partido.partidoId,
      titulo,
      texto,
    };
  }

  private construirActividadConfirmacion(partido: Partido): ActividadItemView {
    const confirmados = partido.jugadoresId?.length ?? 0;
    const titulo = this.getTituloPartido(partido);

    if (confirmados === 0) {
      return {
        id: partido.partidoId,
        titulo: `Aún no hay jugadores para el partido ${titulo}`,
        texto: 'Sé el primero en apuntarte.',
      };
    }

    return {
      id: partido.partidoId,
      titulo: `Ya sois ${confirmados} jugador${confirmados === 1 ? '' : 'es'} para el partido`,
      texto: `${titulo} tiene ${confirmados} jugador${confirmados === 1 ? '' : 'es'} confirmado${confirmados === 1 ? '' : 's'}.`,
    };
  }

  private construirActividadGolesSemana(
    docs: EstadisticaConFechaDoc[],
  ): ActividadItemView | null {
    if (!docs.length) {
      return null;
    }

    const fechaMasReciente = docs[0].fechaCreacion?.toDate?.();

    if (!fechaMasReciente) {
      return null;
    }

    const ahora = Date.now();

    if (ahora - fechaMasReciente.getTime() > VENTANA_ACTIVIDAD_MS) {
      return null;
    }

    const golesSemana = docs
      .filter((d) => {
        const fecha = d.fechaCreacion?.toDate?.();
        return fecha ? ahora - fecha.getTime() <= VENTANA_SEMANA_MS : false;
      })
      .reduce((acc, d) => acc + (Number(d.goles) || 0), 0);

    if (golesSemana <= 0) {
      return null;
    }

    return {
      id: 'goles-semana',
      titulo: `Has marcado ${golesSemana} gol${golesSemana === 1 ? '' : 'es'} esta semana`,
      texto: '¡Sigue así!',
    };
  }
}
