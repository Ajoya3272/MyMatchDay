import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

export type EquipoPartido = 'A' | 'B';
export type GanadorPartido = EquipoPartido | 'empate';

export interface JugadorResultadoPartido {
  jugadorId: string;
  nombreJugador: string;
  equipo: EquipoPartido;
  goles: number;
  asistencias: number;
  minutosJugados?: number;
}

export interface ResultadoPartidoFirestore {
  resultadoId: string;
  partidoId: string;
  golesEquipoA: number;
  golesEquipoB: number;
  duracionRealMinutos: number;
  ganador: GanadorPartido;
  jugadores: JugadorResultadoPartido[];
  fechaRegistro: Timestamp;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

export interface ResultadoPartidoFirestoreWrite {
  resultadoId: string;
  partidoId: string;
  golesEquipoA: number;
  golesEquipoB: number;
  duracionRealMinutos: number;
  ganador: GanadorPartido;
  jugadores: JugadorResultadoPartido[];
  fechaRegistro: Timestamp;
  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
}

export interface JugadorPartidoSelectable {
  jugadorId: string;
  nombre: string;
  equipo: EquipoPartido;
}

export interface EstadisticaJugadorTemporal {
  jugadorId: string;
  goles: number;
  asistencias: number;
  minutosJugados?: number;
}

export interface ResultadoPartidoFormValue {
  golesEquipoA: number;
  golesEquipoB: number;
  duracionRealMinutos: number;
  jugadores: JugadorResultadoPartido[];
}
