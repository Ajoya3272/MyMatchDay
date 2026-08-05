import { Timestamp } from '@angular/fire/firestore';

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
  inicioAnimacionCarruselAt?: Timestamp;
  fechaCreacion?: Timestamp | null;
  fechaActualizacion?: Timestamp | null;
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
  inicioAnimacionCarruselAt?: Timestamp;
  fechaCreacion: unknown;
  fechaActualizacion: unknown;
}

export interface CrearPartidoPayload {
  matchDate: string;
  nombrePartido: string;
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

export interface JugadorVista {
  uid: string | null;
  nombre: string;
  fotoPerfilUrl: string | null;
}

export interface DetallesPartidoVm extends PartidoDetalleView {
  esOrganizador: boolean;
  nombreUsuarioActual: string | null;
  uidUsuarioActual: string | null;
  fotoUrlUsuarioActual: string | null;
  estaEnEquipoA: boolean;
  estaEnEquipoB: boolean;
  estaEnPartido: boolean;
  estaAntesDeEmpezar: boolean;
  estaFinalizado: boolean;
  jugadoresEquipoAVista: JugadorVista[];
  jugadoresEquipoBVista: JugadorVista[];
  jugadoresSinEquipoVista: JugadorVista[];
}
