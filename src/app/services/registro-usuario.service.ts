import { Injectable, inject } from '@angular/core';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  doc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { RegistroUsuarioPayload } from '../interfaces/RegistroUsuario.interface';

@Injectable({
  providedIn: 'root',
})
export class RegistroUsuarioService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);

  private readonly appUrl = 'https://joinmatch.es';

  async registrarUsuario(
    data: RegistroUsuarioPayload,
  ): Promise<UserCredential> {
    const {
      nombre,
      email,
      password,
      sexo,
      fechaNacimiento,
      provincia,
      localidad,
    } = data;

    const emailNormalizado = email.trim().toLowerCase();

    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      emailNormalizado,
      password,
    );

    const user = userCredential.user;

    const [year, month, day] = fechaNacimiento.split('-').map(Number);

    const fechaNacimientoDate = new Date(year, month - 1, day);

    await setDoc(doc(this.firestore, 'usuarios', user.uid), {
      uid: user.uid,
      email: user.email ?? emailNormalizado,
      nombre: nombre.trim(),
      sexo,
      provincia: provincia.trim(),
      localidad: localidad.trim(),
      fechaNacimiento: Timestamp.fromDate(fechaNacimientoDate),
      emailVerificado: user.emailVerified,
      fechaCreacion: serverTimestamp(),
      fechaActualizacion: serverTimestamp(),
    });

    this.auth.languageCode = 'es';

    localStorage.setItem('emailPendienteVerificacion', emailNormalizado);

    await sendEmailVerification(user, {
      url: `${this.appUrl}/verificacion-usuario?email=${encodeURIComponent(emailNormalizado)}`,
      handleCodeInApp: true,
    });

    await signOut(this.auth);

    return userCredential;
  }
}
