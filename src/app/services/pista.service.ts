import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  collection,
  collectionData,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Pista } from '../interfaces/Pista.interface';

interface PartidoFechaDoc {
  fecha?: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class PistaService {
  private firestore = inject(Firestore);

  obtenerPistas(): Observable<Pista[]> {
    const pistasRef = collection(this.firestore, 'pistas');
    const datos = collectionData(pistasRef, { idField: 'pistaId' });
    return datos as Observable<Pista[]>;
  }

  obtenerPartidosDePista(pistaId: string): Observable<PartidoFechaDoc[]> {
    const partidosRef = collection(this.firestore, 'partidos');
    const partidosQuery = query(partidosRef, where('pistaId', '==', pistaId));
    const datos = collectionData(partidosQuery);
    return datos as Observable<PartidoFechaDoc[]>;
  }
}
