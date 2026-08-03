import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { UsuarioFirestore } from '../interfaces/RegistroUsuario.interface';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private firestore = inject(Firestore);

  obtenerUsuarioPorUid(uid: string): Observable<UsuarioFirestore | null> {
    if (!uid?.trim()) {
      return of(null);
    }

    const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
    return docData(usuarioRef) as Observable<UsuarioFirestore | null>;
  }
}
