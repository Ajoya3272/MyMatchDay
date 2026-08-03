import { Timestamp } from '@angular/fire/firestore';

export interface HistorialPartidoFirestore {
  uid: string;
  asistencia: boolean;
  esOrganizador: boolean;
  fecha: Timestamp;
  goles: number;
  nombrePartido: string;
  partidoId: string;
  jugadoresId: string[];
}
