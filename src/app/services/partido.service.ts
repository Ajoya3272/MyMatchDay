import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
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
import { filter, take } from 'rxjs/operators';
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
    const authUser = this.auth.currentUser;

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    const usuario = await firstValueFrom(
      this.loginService.user$.pipe(
        filter((user): user is NonNullable<typeof user> => !!user),
        take(1),
      ),
    );

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
      jugadoresEquipoA: [],
      jugadoresEquipoB: [],
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
