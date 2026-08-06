import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  doc,
  serverTimestamp,
  writeBatch,
  increment,
} from '@angular/fire/firestore';
import { Partido } from '../interfaces/Partido.interface';
import {
  ResultadoPartidoFirestoreWrite,
  JugadorResultadoPartido,
} from '../interfaces/Registro-resultado.interface';

@Injectable({
  providedIn: 'root',
})
export class RegistrarResultadoService {
  private firestore = inject(Firestore);

  async guardarResultado(
    partido: Partido,
    resultado: ResultadoPartidoFirestoreWrite,
  ): Promise<void> {
    if (!partido?.partidoId) {
      throw new Error('partido.partidoId es obligatorio');
    }

    if (!resultado?.resultadoId) {
      throw new Error('resultado.resultadoId es obligatorio');
    }

    if (resultado.partidoId !== partido.partidoId) {
      throw new Error('resultado.partidoId no coincide con partido.partidoId');
    }

    const ganador =
      resultado.golesEquipoA > resultado.golesEquipoB
        ? 'A'
        : resultado.golesEquipoB > resultado.golesEquipoA
          ? 'B'
          : 'empate';

    const batch = writeBatch(this.firestore);

    const resultadoRef = doc(
      this.firestore,
      'resultados-partidos',
      resultado.resultadoId,
    );

    const partidoRef = doc(this.firestore, 'partidos', partido.partidoId);

    batch.set(resultadoRef, {
      resultadoId: resultado.resultadoId,
      partidoId: resultado.partidoId,
      golesEquipoA: resultado.golesEquipoA,
      golesEquipoB: resultado.golesEquipoB,
      duracionRealMinutos: resultado.duracionRealMinutos,
      ganador,
      jugadores: resultado.jugadores,
      fechaRegistro: serverTimestamp(),
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    batch.update(partidoRef, {
      estado: 'finalizado',
      golesEquipoA: resultado.golesEquipoA,
      golesEquipoB: resultado.golesEquipoB,
      duracionMinutos: resultado.duracionRealMinutos,
      fechaActualizacion: serverTimestamp(),
    });

    for (const jugador of resultado.jugadores as JugadorResultadoPartido[]) {
      const victoria =
        ganador === 'empate' ? false : ganador === jugador.equipo;
      const empate = ganador === 'empate';
      const derrota = ganador !== 'empate' && ganador !== jugador.equipo;

      const statRef = doc(
        this.firestore,
        'partidos',
        partido.partidoId,
        'estadisticas',
        jugador.jugadorId,
      );

      const resumenRef = doc(
        this.firestore,
        'usuarios',
        jugador.jugadorId,
        'resumen',
        'estadisticas',
      );

      batch.set(statRef, {
        partidoId: partido.partidoId,
        resultadoId: resultado.resultadoId,
        jugadorId: jugador.jugadorId,
        nombreJugador: jugador.nombreJugador,
        equipo: jugador.equipo,
        goles: Number(jugador.goles) || 0,
        asistencias: Number(jugador.asistencias) || 0,
        minutosJugados: Number(jugador.minutosJugados) || 0,
        victoria,
        empate,
        derrota,
        golesEquipoA: resultado.golesEquipoA,
        golesEquipoB: resultado.golesEquipoB,
        fechaPartido: partido.fecha,
        fechaCreacion: serverTimestamp(),
        fechaActualizacion: serverTimestamp(),
      });

      batch.set(
        resumenRef,
        {
          partidosJugados: increment(1),
          victorias: increment(victoria ? 1 : 0),
          goles: increment(Number(jugador.goles) || 0),
          asistencias: increment(Number(jugador.asistencias) || 0),
          fechaActualizacion: serverTimestamp(),
        },
        { merge: true },
      );
    }

    await batch.commit();
  }
}
