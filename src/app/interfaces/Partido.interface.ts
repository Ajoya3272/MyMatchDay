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
  enlaceInvitacion?: string;
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
  enlaceInvitacion?: string;
  jugadoresEquipoA?: string[];
  jugadoresEquipoB?: string[];
  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
}

export interface CrearPartidoPayload {
  matchDate: string;
  equipoA: string;
  equipoB: string;
  playerCount: number;
  durationMinutes: number;
  ubicacion: string;
}

export interface PartidoDetalleView {
  partido: Partido | null;
  jugadoresTotales: string[];
  jugadoresEquipoA: string[];
  jugadoresEquipoB: string[];
  jugadoresSinEquipo: string[];
  plazasLibres: number;
}

export interface UnirseAPartidoPayload {
  partidoId: string;
  equipoSeleccionado: 'A' | 'B';
}
