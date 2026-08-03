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
  ubicacion: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;

  jugadoresEquipoA?: string[];
  jugadoresEquipoB?: string[];
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
  ubicacion: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;

  jugadoresEquipoA?: string[];
  jugadoresEquipoB?: string[];

  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
}
