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
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { firstValueFrom, Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import {
  CrearPartidoPayload,
  Partido,
  PartidoWrite,
} from '../interfaces/Partido.interface';
import { LoginService } from './login.service';

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

    if (!data.pistaId) {
      throw new Error('Debes seleccionar una pista para crear el partido');
    }

    const fechaPartido = new Date(data.matchDate);

    if (Number.isNaN(fechaPartido.getTime())) {
      throw new Error('La fecha y hora del partido no son válidas');
    }

    const usuario = await firstValueFrom(
      this.loginService.user$.pipe(
        filter((user): user is NonNullable<typeof user> => !!user),
        take(1),
      ),
    );

    const partidoDocRef = doc(collection(this.firestore, 'partidos'));

    const reservaId = this.crearIdReserva(data.pistaId, fechaPartido);
    const reservaDocRef = doc(this.firestore, `reservas/${reservaId}`);

    const partidoData: PartidoWrite = {
      partidoId: partidoDocRef.id,
      nombre: data.nombrePartido.trim(),
      organizador: usuario.nombre,
      organizadorId: authUser.uid,
      fecha: Timestamp.fromDate(fechaPartido),
      estado: 'pendiente',
      equipoA: data.equipoA.trim(),
      equipoB: data.equipoB.trim(),
      ubicacion: data.ubicacion.trim(),
      golesEquipoA: 0,
      golesEquipoB: 0,
      jugadoresId: [],
      participantes: [],
      jugadoresEquipoA: [],
      jugadoresEquipoB: [],
      numeroJugadores: Number(data.playerCount),
      duracionMinutos: Number(data.durationMinutes),
      pistaId: data.pistaId,
      ...(data.pistaNombre ? { pistaNombre: data.pistaNombre } : {}),
      ...(typeof data.precio === 'number'
        ? { precio: data.precio, pagado: true }
        : {}),
      ...(data.paypalOrderId ? { paypalOrderId: data.paypalOrderId } : {}),
      ...(data.paypalPayerId ? { paypalPayerId: data.paypalPayerId } : {}),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    };

    await runTransaction(this.firestore, async (transaction) => {
      const reservaSnapshot = await transaction.get(reservaDocRef);

      if (reservaSnapshot.exists()) {
        throw new Error(
          'Esta pista ya está reservada para la fecha y hora seleccionadas',
        );
      }

      transaction.set(reservaDocRef, {
        pistaId: data.pistaId,
        partidoId: partidoDocRef.id,
        fecha: Timestamp.fromDate(fechaPartido),
        estado: 'reservada',
        fechaCreacion: serverTimestamp(),
      });

      transaction.set(partidoDocRef, partidoData);
    });

    return partidoDocRef.id;
  }

  getPartidos(): Observable<Partido[]> {
    const partidosRef = collection(this.firestore, 'partidos');
    const partidosQuery = query(partidosRef, orderBy('fecha', 'desc'));

    return collectionData(partidosQuery, { idField: 'partidoId' }).pipe(
      map((partidos) => partidos as Partido[]),
    );
  }

  obtenerPartidosOrganizados(uid: string): Observable<Partido[]> {
    const partidosRef = collection(this.firestore, 'partidos');

    const partidosQuery = query(
      partidosRef,
      where('organizadorId', '==', uid),
      orderBy('fecha', 'desc'),
    );

    return collectionData(partidosQuery, { idField: 'partidoId' }).pipe(
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

  private crearIdReserva(pistaId: string, fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hour = String(fecha.getHours()).padStart(2, '0');
    const minute = String(fecha.getMinutes()).padStart(2, '0');

    return `${pistaId}_${year}${month}${day}_${hour}${minute}`;
  }
}
