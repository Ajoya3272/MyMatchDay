import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
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
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
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
export class EstadisticasComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  @Input() partidos: Partido[] = [];

  cards: EstadisticaCard[] = [];
  semanasGoles: SemanaGoles[] = [];
  totalGoles = 0;
  totalPartidos = 0;
  porcentajeVictorias = 0;
  cargando = true;
  sinDatos = false;

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  private cargarEstadisticas(): void {
    this.cargando = true;
    this.sinDatos = false;

    authState(this.auth)
      .pipe(
        switchMap((user) => {
          if (!user) {
            return of([] as EstadisticaJugadorPartidoDoc[]);
          }

          return this.obtenerEstadisticasJugador(user.uid);
        }),
      )
      .subscribe((docs) => {
        this.cargando = false;

        if (!docs.length) {
          this.cards = [];
          this.semanasGoles = [];
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

  private construirCards(
    docs: EstadisticaJugadorPartidoDoc[],
  ): EstadisticaCard[] {
    const jugados = docs.length;
    const goles = docs.reduce((acc, d) => acc + (Number(d.goles) || 0), 0);
    const asistencias = docs.reduce(
      (acc, d) => acc + (Number(d.asistencias) || 0),
      0,
    );
    const victorias = docs.filter((d) => d.victoria).length;
    const empates = docs.filter((d) => d.empate).length;
    const derrotas = docs.filter((d) => d.derrota).length;

    const golesMedia = jugados ? goles / jugados : 0;
    const asistenciasMedia = jugados ? asistencias / jugados : 0;
    const porcentajeVictorias = jugados
      ? Math.round((victorias / jugados) * 100)
      : 0;

    this.totalGoles = goles;
    this.totalPartidos = jugados;
    this.porcentajeVictorias = porcentajeVictorias;

    return [
      {
        key: 'played',
        icon: '⚽',
        title: 'Partidos jugados',
        value: String(jugados),
        subtitle: 'Total en tu historial',
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
          ? `${Math.round((empates / jugados) * 100)}% de tus partidos`
          : 'Sin datos',
        accent: 'amber',
      },
      {
        key: 'lost',
        icon: '📉',
        title: 'Derrotas',
        value: String(derrotas),
        subtitle: jugados
          ? `${Math.round((derrotas / jugados) * 100)}% de tus partidos`
          : 'Sin datos',
        accent: 'red',
      },
      {
        key: 'goals',
        icon: '🥅',
        title: 'Goles totales',
        value: String(goles),
        subtitle: 'Marcados por ti',
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
      if (!fecha) continue;

      const diferencia = ahora - fecha.getTime();
      if (diferencia < 0) continue;

      const indiceDesdeHoy = Math.floor(diferencia / MS_SEMANA);
      if (indiceDesdeHoy >= NUM_SEMANAS_GRAFICA) continue;

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
