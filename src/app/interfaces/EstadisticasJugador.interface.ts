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
