import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { LoginService } from './login.service';
import {
  CrearPartidoPayload,
  Partido,
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
    const nombrePartido = data.nombrePartido.trim();

    const partidoData: PartidoWrite = {
      partidoId: partidoDocRef.id,
      nombre: nombrePartido,
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
      ...(data.pistaId ? { pistaId: data.pistaId } : {}),
      ...(data.pistaNombre ? { pistaNombre: data.pistaNombre } : {}),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    };

    await setDoc(partidoDocRef, partidoData);

    return partidoDocRef.id;
  }

  getPartidos(): Observable<Partido[]> {
    const partidosRef = collection(this.firestore, 'partidos');
    const q = query(partidosRef, orderBy('fecha', 'desc'));

    return collectionData(q, { idField: 'partidoId' }).pipe(
      map((partidos) => partidos as Partido[]),
    );
  }

  async unirseAPartido(partidoId: string): Promise<void> {
    const authUser = this.auth.currentUser;

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);

    await updateDoc(partidoRef, {
      participantes: arrayUnion(authUser.uid),
      jugadoresId: arrayUnion(authUser.uid),
      fechaActualizacion: serverTimestamp(),
    });
  }

  async salirDePartido(partidoId: string): Promise<void> {
    const authUser = this.auth.currentUser;

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);

    await updateDoc(partidoRef, {
      participantes: arrayRemove(authUser.uid),
      jugadoresId: arrayRemove(authUser.uid),
      fechaActualizacion: serverTimestamp(),
    });
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

  async iniciarPartido(partidoId: string): Promise<void> {
    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);

    await updateDoc(partidoRef, {
      estado: 'en progreso',
      inicioAnimacionCarruselAt: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });
  }

  async finalizarPartido(partidoId: string): Promise<void> {
    const partidoRef = doc(this.firestore, `partidos/${partidoId}`);

    await updateDoc(partidoRef, {
      estado: 'finalizado',
      fechaActualizacion: serverTimestamp(),
    });
  }
}
