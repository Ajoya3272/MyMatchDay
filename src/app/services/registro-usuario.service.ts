import { Injectable, inject } from '@angular/core';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';

export interface RegistroUsuarioPayload {
  nombre: string;
  email: string;
  password: string;
  sexo: 'hombre' | 'mujer';
  fechaNacimiento: string;
}

export interface UsuarioFirestore {
  uid: string;
  email: string;
  nombre: string;
  sexo: 'hombre' | 'mujer';
  fechaNacimiento: Timestamp;
  emailVerificado: boolean;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

@Injectable({
  providedIn: 'root',
})
export class RegistroUsuarioService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  async registrarUsuario(
    data: RegistroUsuarioPayload,
  ): Promise<UserCredential> {
    const { nombre, email, password, sexo, fechaNacimiento } = data;

    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      email,
      password,
    );

    const user = userCredential.user;

    const [year, month, day] = fechaNacimiento.split('-').map(Number);
    const fechaNacimientoDate = new Date(year, month - 1, day);

    await setDoc(doc(this.firestore, `usuarios/${user.uid}`), {
      uid: user.uid,
      email: user.email ?? email,
      nombre,
      sexo,
      fechaNacimiento: Timestamp.fromDate(fechaNacimientoDate),
      emailVerificado: false,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    this.auth.languageCode = 'es';

    await sendEmailVerification(user, {
      url: 'http://localhost:8100/verificacion-usuario',
      handleCodeInApp: false,
    });

    return userCredential;
  }
}
