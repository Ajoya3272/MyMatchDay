import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  endAt,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAt,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { UsuarioFirestore } from '../interfaces/RegistroUsuario.interface';

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  obtenerUsuarioPorUid(uid: string): Observable<UsuarioFirestore | null> {
    if (!uid?.trim()) {
      return of(null);
    }

    const usuarioRef = doc(this.firestore, `usuarios/${uid}`);
    return docData(usuarioRef) as Observable<UsuarioFirestore | null>;
  }

  async buscarUsuarios(textoBusqueda: string): Promise<UsuarioFirestore[]> {
    const texto = textoBusqueda.trim();

    if (!texto) {
      return [];
    }

    const authUser = this.auth.currentUser;
    const usuariosRef = collection(this.firestore, 'usuarios');

    const usuariosQuery = query(
      usuariosRef,
      orderBy('nombre'),
      startAt(texto),
      endAt(`${texto}\uf8ff`),
    );

    const snapshot = await getDocs(usuariosQuery);

    return snapshot.docs
      .map((docSnap) => docSnap.data() as UsuarioFirestore)
      .filter((usuario) => usuario.uid !== authUser?.uid);
  }

  esAmigo(amigoUid: string): Observable<boolean> {
    const authUser = this.auth.currentUser;

    if (!authUser) {
      return of(false);
    }

    const amigoRef = doc(
      this.firestore,
      'usuarios',
      authUser.uid,
      'amigos',
      amigoUid,
    );

    return docData(amigoRef).pipe(map((data) => !!data));
  }

  async agregarAmigo(amigo: UsuarioFirestore): Promise<void> {
    const authUser = this.auth.currentUser;

    if (!authUser) {
      throw new Error('No hay usuario autenticado');
    }

    const amigoRef = doc(
      this.firestore,
      'usuarios',
      authUser.uid,
      'amigos',
      amigo.uid,
    );

    await setDoc(amigoRef, {
      uid: amigo.uid,
      nombre: amigo.nombre,
      fotoPerfilUrl: amigo.fotoPerfilUrl ?? null,
      fechaCreacion: serverTimestamp(),
    });
  }
  obtenerSeguidos(): Observable<UsuarioFirestore[]> {
    const authUser = this.auth.currentUser;

    if (!authUser) {
      return of([]);
    }

    const seguidosRef = collection(
      this.firestore,
      'usuarios',
      authUser.uid,
      'amigos',
    );

    return collectionData(seguidosRef).pipe(
      map((seguidos) => seguidos as UsuarioFirestore[]),
    );
  }
}
