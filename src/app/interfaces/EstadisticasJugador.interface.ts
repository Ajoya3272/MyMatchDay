import { Timestamp } from 'firebase/firestore';
import { Partido } from './Partido.interface';
export type EstadoPartido = 'pendiente' | 'en progreso' | 'finalizado';

export type MetricKey =
  | 'played'
  | 'won'
  | 'drawn'
  | 'lost'
  | 'goals'
  | 'goalsAvg'
  | 'assists'
  | 'assistsAvg';

export type EstadisticaJugadorPartidoWrite = {
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
  fechaPartido: unknown;
  fechaCreacion: unknown;
  fechaActualizacion: unknown;
};

export interface PartidoHomeView extends Partido {
  estadoCalculado: EstadoPartido;
  estadoTexto: string;
  estadoClase: 'pending' | 'progress' | 'finished';
}

export interface EstadisticasUsuarioView {
  partidosJugados: number;
  victorias: number;
  goles: number;
  asistencias: number;
}

export interface EstadisticaJugadorPartidoDoc {
  equipo?: 'A' | 'B';
  goles?: number;
  asistencias?: number;
  victoria?: boolean;
  empate?: boolean;
  derrota?: boolean;
}

export interface EstadisticaConFechaDoc {
  jugadorId?: string;
  goles?: number;
  fechaCreacion?: Timestamp;
}

export interface ActividadItemView {
  id: string;
  titulo: string;
  texto: string;
}

export interface EstadisticaCard {
  key: MetricKey;
  title: string;
  value: string;
  subtitle: string;
  trend?: string;
  trendClass?: 'up' | 'down' | 'neutral';
}

export interface EstadisticaJugadorPartidoDoc {
  jugadorId?: string;
  goles?: number;
  asistencias?: number;
  victoria?: boolean;
  empate?: boolean;
  derrota?: boolean;
  fechaCreacion?: Timestamp;
}

export interface SemanaGoles {
  label: string;
  goles: number;
  porcentajeAltura: number;
}
