import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { LoginService } from './login.service';
import {
  CrearPartidoPayload,
  PartidoWrite,
} from '../interfaces/Partido.interface';

@Injectable({
  providedIn: 'root',
})
export class PartidoService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private loginService = inject(LoginService);

  async crearPartido(data: CrearPartidoPayload): Promise<string> {
    const authUser = await firstValueFrom(authState(this.auth));
    const usuario = await firstValueFrom(this.loginService.user$);

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    if (!usuario) {
      throw new Error('No se encontraron los datos del usuario');
    }

    const partidosCollectionRef = collection(this.firestore, 'partidos');
    const partidoDocRef = doc(partidosCollectionRef);

    const equipoA = data.equipoA.trim();
    const equipoB = data.equipoB.trim();
    const ubicacion = data.ubicacion.trim();

    const partidoData: PartidoWrite = {
      partidoId: partidoDocRef.id,
      nombre: `${equipoA} vs ${equipoB}`,
      organizador: usuario.nombre,
      organizadorId: authUser.uid,
      fecha: Timestamp.fromDate(new Date(data.matchDate)),
      estado: 'pendiente',
      equipoA,
      equipoB,
      ubicacion,
      golesEquipoA: 0,
      golesEquipoB: 0,
      jugadoresId: [],
      participantes: [],
      numeroJugadores: Number(data.playerCount),
      duracionMinutos: Number(data.durationMinutes),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    };

    await setDoc(partidoDocRef, partidoData);

    return partidoDocRef.id;
  }

  async guardarEnlaceInvitacion(
    partidoId: string,
    enlaceInvitacion: string,
  ): Promise<void> {
    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);

    await updateDoc(partidoRef, {
      enlaceInvitacion,
      fechaActualizacion: serverTimestamp(),
    });
  }
}
