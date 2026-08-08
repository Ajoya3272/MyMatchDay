import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, of, shareReplay, switchMap } from 'rxjs';

import { cloudinary } from '../../enviroments/enviroment';
import { UsuarioFirestore } from '../interfaces/RegistroUsuario.interface';

type DatosPerfilActualizables = Partial<
  Pick<UsuarioFirestore, 'nombre' | 'provincia' | 'localidad'>
>;

@Injectable({
  providedIn: 'root',
})
export class MiPerfilService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private readonly cloudName = cloudinary.cloudName;
  private readonly uploadPreset = cloudinary.uploadPreset;

  usuario$: Observable<UsuarioFirestore | null> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }

      const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);

      return docData(userDocRef) as Observable<UsuarioFirestore>;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  async obtenerUidActual(): Promise<string | null> {
    const currentUser = await firstValueFrom(authState(this.auth));
    return currentUser?.uid ?? null;
  }

  async actualizarDatosPerfil(datos: DatosPerfilActualizables): Promise<void> {
    const uid = await this.obtenerUidActual();

    if (!uid) {
      throw new Error('No hay usuario autenticado');
    }

    const userDocRef = doc(this.firestore, `usuarios/${uid}`);

    await updateDoc(userDocRef, {
      ...datos,
      fechaActualizacion: serverTimestamp(),
    });
  }

  async subirFotoPerfil(file: File): Promise<string> {
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      console.error('Respuesta de Cloudinary:', data);
      throw new Error('No se pudo subir la imagen a Cloudinary');
    }

    return data.secure_url;
  }

  async actualizarFotoPerfil(fotoPerfilUrl: string): Promise<void> {
    const uid = await this.obtenerUidActual();

    if (!uid) {
      throw new Error('No hay usuario autenticado');
    }

    const userDocRef = doc(this.firestore, `usuarios/${uid}`);

    await updateDoc(userDocRef, {
      fotoPerfilUrl,
      fechaActualizacion: serverTimestamp(),
    });
  }

  async cambiarFotoPerfil(file: File): Promise<string> {
    const imageUrl = await this.subirFotoPerfil(file);
    await this.actualizarFotoPerfil(imageUrl);
    return imageUrl;
  }
}
