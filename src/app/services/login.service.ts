import { Injectable, inject } from '@angular/core';
import {
  Auth,
  UserCredential,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';

export interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private auth = inject(Auth);

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
}
