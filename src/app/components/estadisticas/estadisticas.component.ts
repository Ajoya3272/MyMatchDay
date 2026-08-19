import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  collectionData,
  collectionGroup,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import { IonContent } from '@ionic/angular/standalone';
import { Observable, Subject, of, switchMap, takeUntil } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Partido } from '../../interfaces/Partido.interface';

type MetricKey =
  | 'played'
  | 'won'
  | 'drawn'
  | 'lost'
  | 'goals'
  | 'goalsAvg'
  | 'assists'
  | 'assistsAvg';

interface EstadisticaCard {
  key: MetricKey;
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  accent: 'green' | 'blue' | 'amber' | 'red' | 'purple';
}

interface EstadisticaJugadorPartidoDoc {
  jugadorId?: string;
  goles?: number;
  asistencias?: number;
  victoria?: boolean;
  empate?: boolean;
  derrota?: boolean;
  fechaCreacion?: Timestamp;
}

interface SemanaGoles {
  label: string;
  goles: number;
  porcentajeAltura: number;
}

const MS_SEMANA = 7 * 24 * 60 * 60 * 1000;
const NUM_SEMANAS_GRAFICA = 6;

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class EstadisticasComponent implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private route = inject(ActivatedRoute);
  private destroy$ = new Subject<void>();

  @Input() partidos: Partido[] = [];

  cards: EstadisticaCard[] = [];
  semanasGoles: SemanaGoles[] = [];
  totalGoles = 0;
  totalPartidos = 0;
  porcentajeVictorias = 0;
  cargando = true;
  sinDatos = false;

  jugadorId = '';
  nombreJugador = '';
  viendoPerfilAjeno = false;

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const jugadorIdUrl = params.get('jugadorId')?.trim() ?? '';
        const nombreUrl = params.get('nombre')?.trim() ?? '';

        this.jugadorId = jugadorIdUrl;
        this.nombreJugador = nombreUrl;
        this.viendoPerfilAjeno = !!jugadorIdUrl;

        this.cargarEstadisticas(jugadorIdUrl);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get tituloHistorial(): string {
    if (this.viendoPerfilAjeno && this.nombreJugador) {
      return `Historial de ${this.nombreJugador}`;
    }

    return 'Tus estadísticas';
  }

  get textoCargando(): string {
    if (this.viendoPerfilAjeno && this.nombreJugador) {
      return `Cargando estadísticas de ${this.nombreJugador}...`;
    }

    return 'Cargando tus estadísticas...';
  }

  get tituloSinDatos(): string {
    if (this.viendoPerfilAjeno && this.nombreJugador) {
      return `${this.nombreJugador} todavía no tiene estadísticas`;
    }

    return 'Todavía no tienes estadísticas';
  }

  get textoSinDatos(): string {
    if (this.viendoPerfilAjeno && this.nombreJugador) {
      return 'Cuando registre resultados de partidos, aparecerán aquí.';
    }

    return 'Registra el resultado de un partido y aparecerán aquí.';
  }

  get etiquetaGolesTotales(): string {
    if (this.viendoPerfilAjeno && this.nombreJugador) {
      return `Goles totales de ${this.nombreJugador}`;
    }

    return 'Goles totales';
  }

  private cargarEstadisticas(jugadorIdUrl: string): void {
    this.cargando = true;
    this.sinDatos = false;
    this.resetearEstadisticas();

    authState(this.auth)
      .pipe(
        takeUntil(this.destroy$),
        switchMap((usuarioAutenticado) => {
          const jugadorIdObjetivo =
            jugadorIdUrl || usuarioAutenticado?.uid || '';

          if (!jugadorIdObjetivo) {
            return of([] as EstadisticaJugadorPartidoDoc[]);
          }

          if (!this.nombreJugador) {
            this.nombreJugador = 'tu perfil';
          }

          return this.obtenerEstadisticasJugador(jugadorIdObjetivo);
        }),
      )
      .subscribe((docs) => {
        this.cargando = false;

        if (!docs.length) {
          this.sinDatos = true;
          return;
        }

        this.sinDatos = false;
        this.cards = this.construirCards(docs);
        this.semanasGoles = this.construirGraficaSemanal(docs);
      });
  }

  private obtenerEstadisticasJugador(
    uid: string,
  ): Observable<EstadisticaJugadorPartidoDoc[]> {
    const estadisticasRef = collectionGroup(this.firestore, 'estadisticas');

    const estadisticasQuery = query(
      estadisticasRef,
      where('jugadorId', '==', uid),
      orderBy('fechaCreacion', 'desc'),
    );

    return collectionData(estadisticasQuery).pipe(
      map((docs) => docs as EstadisticaJugadorPartidoDoc[]),
      catchError((error) => {
        console.error('[ESTADISTICAS] Error cargando estadísticas:', error);
        return of([]);
      }),
    );
  }

  private resetearEstadisticas(): void {
    this.cards = [];
    this.semanasGoles = [];
    this.totalGoles = 0;
    this.totalPartidos = 0;
    this.porcentajeVictorias = 0;
  }

  private construirCards(
    docs: EstadisticaJugadorPartidoDoc[],
  ): EstadisticaCard[] {
    const jugados = docs.length;

    const goles = docs.reduce(
      (acumulado, doc) => acumulado + (Number(doc.goles) || 0),
      0,
    );

    const asistencias = docs.reduce(
      (acumulado, doc) => acumulado + (Number(doc.asistencias) || 0),
      0,
    );

    const victorias = docs.filter((doc) => doc.victoria).length;
    const empates = docs.filter((doc) => doc.empate).length;
    const derrotas = docs.filter((doc) => doc.derrota).length;

    const golesMedia = jugados ? goles / jugados : 0;
    const asistenciasMedia = jugados ? asistencias / jugados : 0;

    const porcentajeVictorias = jugados
      ? Math.round((victorias / jugados) * 100)
      : 0;

    this.totalGoles = goles;
    this.totalPartidos = jugados;
    this.porcentajeVictorias = porcentajeVictorias;

    const sufijoHistorial = this.viendoPerfilAjeno
      ? `de ${this.nombreJugador}`
      : 'en tu historial';

    return [
      {
        key: 'played',
        icon: '⚽',
        title: 'Partidos jugados',
        value: String(jugados),
        subtitle: `Total ${sufijoHistorial}`,
        accent: 'blue',
      },
      {
        key: 'won',
        icon: '🏆',
        title: 'Partidos ganados',
        value: String(victorias),
        subtitle: `${porcentajeVictorias}% de victorias`,
        accent: 'green',
      },
      {
        key: 'drawn',
        icon: '🤝',
        title: 'Empates',
        value: String(empates),
        subtitle: jugados
          ? `${Math.round((empates / jugados) * 100)}% de los partidos`
          : 'Sin datos',
        accent: 'amber',
      },
      {
        key: 'lost',
        icon: '📉',
        title: 'Derrotas',
        value: String(derrotas),
        subtitle: jugados
          ? `${Math.round((derrotas / jugados) * 100)}% de los partidos`
          : 'Sin datos',
        accent: 'red',
      },
      {
        key: 'goals',
        icon: '🥅',
        title: 'Goles totales',
        value: String(goles),
        subtitle: this.viendoPerfilAjeno
          ? `Marcados por ${this.nombreJugador}`
          : 'Marcados por ti',
        accent: 'green',
      },
      {
        key: 'goalsAvg',
        icon: '📊',
        title: 'Media de goles',
        value: golesMedia.toFixed(2),
        subtitle: 'Por partido jugado',
        accent: 'blue',
      },
      {
        key: 'assists',
        icon: '🎯',
        title: 'Asistencias totales',
        value: String(asistencias),
        subtitle: 'Pases de gol dados',
        accent: 'purple',
      },
      {
        key: 'assistsAvg',
        icon: '📈',
        title: 'Media de asistencias',
        value: asistenciasMedia.toFixed(2),
        subtitle: 'Por partido jugado',
        accent: 'purple',
      },
    ];
  }

  private construirGraficaSemanal(
    docs: EstadisticaJugadorPartidoDoc[],
  ): SemanaGoles[] {
    const ahora = Date.now();

    const golesPorSemana = new Array(NUM_SEMANAS_GRAFICA).fill(0) as number[];

    for (const doc of docs) {
      const fecha = doc.fechaCreacion?.toDate?.();

      if (!fecha) {
        continue;
      }

      const diferencia = ahora - fecha.getTime();

      if (diferencia < 0) {
        continue;
      }

      const indiceDesdeHoy = Math.floor(diferencia / MS_SEMANA);

      if (indiceDesdeHoy >= NUM_SEMANAS_GRAFICA) {
        continue;
      }

      const indiceCronologico = NUM_SEMANAS_GRAFICA - 1 - indiceDesdeHoy;

      golesPorSemana[indiceCronologico] += Number(doc.goles) || 0;
    }

    const maximo = Math.max(...golesPorSemana, 1);

    return golesPorSemana.map((goles, index) => {
      const semanasAtras = NUM_SEMANAS_GRAFICA - 1 - index;

      const label =
        semanasAtras === 0 ? 'Esta sem.' : `Hace ${semanasAtras} sem.`;

      return {
        label,
        goles,
        porcentajeAltura: Math.max(
          Math.round((goles / maximo) * 100),
          goles > 0 ? 10 : 0,
        ),
      };
    });
  }
}
