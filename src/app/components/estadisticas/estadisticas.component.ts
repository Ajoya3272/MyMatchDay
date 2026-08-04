import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Partido } from '../../interfaces/Partido.interface';

type MetricKey =
  | 'played'
  | 'won'
  | 'goals'
  | 'assists'
  | 'matchesPerMonth'
  | 'avgDuration';

interface EstadisticaCard {
  key: MetricKey;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendClass?: 'up' | 'down' | 'neutral';
}

@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.component.html',
  styleUrls: ['./estadisticas.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class EstadisticasComponent implements OnChanges {
  @Input() partidos: Partido[] = [];
  @Input() uid = '';

  cards: EstadisticaCard[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partidos'] || changes['uid']) {
      this.buildCards();
    }
  }

  private buildCards(): void {
    const partidos = this.partidos ?? [];
    const jugados = this.getPartidosJugados(partidos);
    const ganados = this.getVictorias(partidos);
    const goles = this.getGoles(partidos);
    const asistencias = this.getAsistencias(partidos);
    const mediaMes = this.getMediaPartidosPorMes(partidos);
    const mediaDuracion = this.getMediaDuracion(partidos);

    this.cards = [
      {
        key: 'played',
        title: 'Partidos jugados',
        value: String(jugados),
        subtitle: 'Total de partidos en tu historial',
        trend: this.getTrendText(jugados),
        trendClass: 'neutral',
      },
      {
        key: 'won',
        title: 'Partidos ganados',
        value: String(ganados),
        subtitle: 'Victorias registradas',
        trend: jugados > 0 ? `${Math.round((ganados / jugados) * 100)}%` : '0%',
        trendClass: ganados >= Math.ceil(jugados / 2) ? 'up' : 'neutral',
      },
      {
        key: 'goals',
        title: 'Goles',
        value: String(goles),
        subtitle: 'Goles a favor',
        trend: this.getAveragePerMatch(goles, jugados),
        trendClass: 'up',
      },
      {
        key: 'assists',
        title: 'Asistencias',
        value: String(asistencias),
        subtitle: 'Pases de gol',
        trend: this.getAveragePerMatch(asistencias, jugados),
        trendClass: 'up',
      },
      {
        key: 'matchesPerMonth',
        title: 'Media de partidos / mes',
        value: mediaMes.toFixed(1),
        subtitle: 'Ritmo de juego mensual',
        trend: 'Promedio',
        trendClass: 'neutral',
      },
      {
        key: 'avgDuration',
        title: 'Media de duración',
        value: `${mediaDuracion.toFixed(0)} min`,
        subtitle: 'Duración media de tus partidos',
        trend: 'Tiempo',
        trendClass: 'neutral',
      },
    ];
  }

  private getPartidosJugados(partidos: Partido[]): number {
    return partidos.filter((partido) => this.isUserInMatch(partido)).length;
  }

  private getVictorias(partidos: Partido[]): number {
    return partidos.filter((partido) => this.isVictory(partido)).length;
  }

  private isVictory(partido: Partido): boolean {
    const golesA = partido.golesEquipoA ?? 0;
    const golesB = partido.golesEquipoB ?? 0;

    if (golesA === golesB) {
      return false;
    }

    const equipoUsuario = this.getUserTeam(partido);

    if (equipoUsuario === 'A') {
      return golesA > golesB;
    }

    if (equipoUsuario === 'B') {
      return golesB > golesA;
    }

    return false;
  }

  private isUserInMatch(partido: Partido): boolean {
    return this.getUserTeam(partido) !== null;
  }

  private getUserTeam(partido: Partido): 'A' | 'B' | null {
    if (!this.uid) {
      return null;
    }

    if ((partido.jugadoresEquipoA ?? []).includes(this.uid)) {
      return 'A';
    }

    if ((partido.jugadoresEquipoB ?? []).includes(this.uid)) {
      return 'B';
    }

    return null;
  }

  private getGoles(partidos: Partido[]): number {
    return partidos.reduce((acc, partido) => {
      if (!this.isUserInMatch(partido)) {
        return acc;
      }

      const equipoUsuario = this.getUserTeam(partido);

      if (equipoUsuario === 'A') {
        return acc + (partido.golesEquipoA ?? 0);
      }

      if (equipoUsuario === 'B') {
        return acc + (partido.golesEquipoB ?? 0);
      }

      return acc;
    }, 0);
  }

  private getAsistencias(partidos: Partido[]): number {
    return partidos.reduce((acc, partido) => {
      const partidoAsistencias = (
        partido as Partido & { asistencias?: Record<string, number> }
      ).asistencias;
      if (!partidoAsistencias || !this.uid) {
        return acc;
      }

      return acc + (partidoAsistencias[this.uid] ?? 0);
    }, 0);
  }

  private getMediaPartidosPorMes(partidos: Partido[]): number {
    const partidosUsuario = partidos.filter((partido) =>
      this.isUserInMatch(partido),
    );

    if (!partidosUsuario.length) {
      return 0;
    }

    const fechas = partidosUsuario
      .map((p) => p.fecha?.toDate?.())
      .filter((d): d is Date => !!d);

    if (!fechas.length) {
      return 0;
    }

    const minDate = new Date(Math.min(...fechas.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...fechas.map((d) => d.getTime())));

    const months =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      (maxDate.getMonth() - minDate.getMonth()) +
      1;

    return partidosUsuario.length / Math.max(months, 1);
  }

  private getMediaDuracion(partidos: Partido[]): number {
    const partidosUsuario = partidos.filter((partido) =>
      this.isUserInMatch(partido),
    );

    if (!partidosUsuario.length) {
      return 0;
    }

    const total = partidosUsuario.reduce(
      (acc, partido) => acc + (partido.duracionMinutos ?? 0),
      0,
    );

    return total / partidosUsuario.length;
  }

  private getAveragePerMatch(total: number, matches: number): string {
    if (!matches) {
      return '0.0 por partido';
    }

    return `${(total / matches).toFixed(1)} por partido`;
  }

  private getTrendText(value: number): string {
    return value > 0 ? 'Activo' : 'Sin datos';
  }
}
