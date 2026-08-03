import { Timestamp } from 'firebase/firestore';

export interface CarruselPartido {
  partidoId: string;
  nombre: string;
  equipoA: string;
  equipoB: string;
  fecha: Timestamp;
  estado: string;
  organizador: string;
  organizadorId: string;
  golesEquipoA: number;
  golesEquipoB: number;
  jugadoresId: string[];
  participantes: string[];
  numeroJugadores: number;
  duracionMinutos: number;
  ubicacion?: string;
}
