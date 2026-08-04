import { Timestamp, serverTimestamp } from '@angular/fire/firestore';

export interface JugadorFirestore {
  jugadorId: string;
  uid: string;
  nombre: string;
  email: string;
  fotoPerfilUrl?: string;

  partidosJugados: number;
  partidosGanados: number;
  goles: number;
  asistencias: number;
  mediaPartidosAlMes: number;
  mediaDuracionPartidos: number;

  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

export interface JugadorFirestoreWrite {
  jugadorId: string;
  uid: string;
  nombre: string;
  email: string;
  fotoPerfilUrl?: string;

  partidosJugados: number;
  partidosGanados: number;
  goles: number;
  asistencias: number;
  mediaPartidosAlMes: number;
  mediaDuracionPartidos: number;

  fechaCreacion: ReturnType<typeof serverTimestamp>;
  fechaActualizacion: ReturnType<typeof serverTimestamp>;
}
