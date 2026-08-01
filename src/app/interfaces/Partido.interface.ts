import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

export interface Partido {
  partidoId: string;
  nombre: string;
  organizador: string;
  organizadorId: string;
  fecha: Timestamp;
  estado: string;
  equipoA: string;
  equipoB: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;
}

export interface PartidoWrite {
  partidoId: string;
  nombre: string;
  organizador: string;
  organizadorId: string;
  fecha: Timestamp;
  estado: string;
  equipoA: string;
  equipoB: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;
  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
}
