import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  arrayUnion,
  doc,
  docData,
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
    const jugadoresActuales = partido.participantes ?? [];

    if (jugadoresActuales.includes(usuario.nombre)) {
      return;
    }

    const totalActual = jugadoresActuales.length;

    if (totalActual >= partido.numeroJugadores) {
      throw new Error('El partido ya está completo');
    }

    const equipoField =
      payload.equipoSeleccionado === 'A'
        ? 'jugadoresEquipoA'
        : 'jugadoresEquipoB';

    await updateDoc(partidoRef, {
      jugadoresId: arrayUnion(authUser.uid),
      participantes: arrayUnion(usuario.nombre),
      [equipoField]: arrayUnion(usuario.nombre),
      fechaActualizacion: serverTimestamp(),
    });
  }
}
