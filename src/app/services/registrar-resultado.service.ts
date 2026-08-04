import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Partido } from '../interfaces/Partido.interface';
import { ResultadoPartidoFirestoreWrite } from '../interfaces/Registro-resultado.interface';

@Injectable({
  providedIn: 'root',
})
export class RegistrarResultadoService {
  private firestore = inject(Firestore);

  async guardarResultado(
    partido: Partido,
    resultado: ResultadoPartidoFirestoreWrite,
  ): Promise<void> {
    const resultadoRef = doc(
      collection(this.firestore, 'resultados-partidos'),
      resultado.resultadoId,
    );

    const partidoRef = doc(this.firestore, 'partidos', partido.partidoId);

    await setDoc(resultadoRef, {
      ...resultado,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    await updateDoc(partidoRef, {
      estado: 'finalizado',
      golesEquipoA: resultado.golesEquipoA,
      golesEquipoB: resultado.golesEquipoB,
      duracionMinutos: resultado.duracionRealMinutos,
      fechaActualizacion: serverTimestamp(),
    });
  }
}
