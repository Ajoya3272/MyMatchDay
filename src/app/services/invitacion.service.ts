import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { LoginService } from './login.service';
import {
  Partido,
  UnirseAPartidoPayload,
} from '../interfaces/Partido.interface';

type ParticipantePartido = {
  uid: string;
  nombre: string;
};

@Injectable({
  providedIn: 'root',
})
export class InvitacionService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private loginService = inject(LoginService);

  async obtenerPartido(partidoId: string): Promise<Partido | null> {
    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);
    const snapshot = await getDoc(partidoRef);

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as Partido;
  }

  async unirseAPartido(payload: UnirseAPartidoPayload): Promise<void> {
    const authUser = await firstValueFrom(authState(this.auth));
    const usuario = await firstValueFrom(this.loginService.user$);

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    if (!usuario) {
      throw new Error('No se encontraron los datos del usuario');
    }

    const partidoRef = doc(this.firestore, `partidos/${payload.partidoId}`);
    const partidoSnapshot = await getDoc(partidoRef);

    if (!partidoSnapshot.exists()) {
      throw new Error('El partido no existe');
    }

    const partido = partidoSnapshot.data() as Partido;

    const jugadoresActuales = partido.jugadoresId ?? [];

    if (jugadoresActuales.includes(authUser.uid)) {
      return;
    }

    if (jugadoresActuales.length >= partido.numeroJugadores) {
      throw new Error('El partido ya está completo');
    }

    const equipoField =
      payload.equipoSeleccionado === 'A'
        ? 'jugadoresEquipoA'
        : 'jugadoresEquipoB';

    const participante: ParticipantePartido = {
      uid: authUser.uid,
      nombre: usuario.nombre,
    };

    await updateDoc(partidoRef, {
      jugadoresId: arrayUnion(authUser.uid),
      participantes: arrayUnion(participante),
      [equipoField]: arrayUnion(authUser.uid),
      fechaActualizacion: serverTimestamp(),
    });
  }
}
