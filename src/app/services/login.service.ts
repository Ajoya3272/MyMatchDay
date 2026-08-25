import { Injectable, inject } from '@angular/core';
import {
  Auth,
  UserCredential,
  authState,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { Firestore, doc, docData, updateDoc } from '@angular/fire/firestore';
import {
  firstValueFrom,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { UsuarioFirestore } from '../interfaces/RegistroUsuario.interface';
import { NotificacionesService } from './notificaciones.service';

export interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private notificacionesService = inject(NotificacionesService);

  authUser$ = authState(this.auth).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  user$: Observable<UsuarioFirestore | null> = this.authUser$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }

      const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
      return docData(userDocRef) as Observable<UsuarioFirestore>;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  inicialUsuario$: Observable<string> = this.user$.pipe(
    map((user) => this.obtenerInicialUsuario(user)),
  );

  fotoPerfilUrl$: Observable<string | null> = this.user$.pipe(
    map((user) => user?.fotoPerfilUrl ?? null),
  );

  async iniciarSesion(data: LoginPayload): Promise<UserCredential> {
    const credential = await signInWithEmailAndPassword(
      this.auth,
      data.email.trim().toLowerCase(),
      data.password,
    );

    await credential.user.reload();

    if (!credential.user.emailVerified) {
      await signOut(this.auth);

      const error = new Error('EMAIL_NOT_VERIFIED');
      (error as any).code = 'auth/email-not-verified';
      throw error;
    }

    await credential.user.getIdToken(true);

    await this.sincronizarEmailVerificado(
      credential.user.uid,
      credential.user.emailVerified,
    );

    await this.notificacionesService.inicializarPush();

    return credential;
  }

  async cerrarSesion(): Promise<void> {
    await this.notificacionesService.eliminarTokenPushActual();
    await signOut(this.auth);
  }

  async inicializarPushSiHaySesion(): Promise<void> {
    const user = await firstValueFrom(this.authUser$);

    if (!user || !user.emailVerified) {
      return;
    }

    await this.notificacionesService.inicializarPush();
  }

  obtenerInicialUsuario(user: UsuarioFirestore | null): string {
    const nombre = user?.nombre?.trim() || user?.email?.trim() || 'U';
    return nombre.charAt(0).toUpperCase();
  }

  private async sincronizarEmailVerificado(
    uid: string,
    emailVerificado: boolean,
  ): Promise<void> {
    const userDocRef = doc(this.firestore, `usuarios/${uid}`);

    await updateDoc(userDocRef, {
      emailVerificado,
    });
  }
}
