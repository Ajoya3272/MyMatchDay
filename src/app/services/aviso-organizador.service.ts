import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  Unsubscribe,
  collectionGroup,
  onSnapshot,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { NotificacionesService } from './notificaciones.service';

interface AvisoOrganizadorDoc {
  tipo?: string;
  partidoNombre?: string;
  jugadorNombre?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AvisosOrganizadorService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private notificacionesService = inject(NotificacionesService);

  private detenerEscucha: Unsubscribe | null = null;

  escuchar(): void {
    authState(this.auth).subscribe((user) => {
      this.detenerEscucha?.();
      this.detenerEscucha = null;

      if (!user) {
        return;
      }

      const avisosQuery = query(
        collectionGroup(this.firestore, 'avisos'),
        where('organizadorId', '==', user.uid),
        where('leido', '==', false),
      );

      this.detenerEscucha = onSnapshot(avisosQuery, (snapshot) => {
        snapshot.docChanges().forEach((cambio) => {
          if (cambio.type !== 'added') {
            return;
          }

          const data = cambio.doc.data() as AvisoOrganizadorDoc;

          if (data.tipo === 'abandono') {
            void this.notificacionesService.notificarAbandonoEquipo(
              data.jugadorNombre ?? 'Un jugador',
              data.partidoNombre ?? 'tu partido',
            );
          }

          void updateDoc(cambio.doc.ref, { leido: true });
        });
      });
    });
  }
}
