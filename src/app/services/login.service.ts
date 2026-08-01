import { Injectable, inject } from '@angular/core';
import {
  Auth,
  User,
  UserCredential,
  authState,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { map, Observable } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private auth = inject(Auth);

  user$: Observable<User | null> = authState(this.auth);

  inicialUsuario$: Observable<string> = this.user$.pipe(
    map((user) => this.obtenerInicialUsuario(user)),
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

    return credential;
  }

  async cerrarSesion(): Promise<void> {
    await signOut(this.auth);
  }

  obtenerInicialUsuario(user: User | null): string {
    const nombre = user?.displayName?.trim() || user?.email?.trim() || 'U';

    return nombre.charAt(0).toUpperCase();
  }
}
0;
