import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  footballOutline,
  mailOutline,
  keyOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonNote,
    IonSpinner,
  ],
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);

  loading = false;
  showPassword = false;
  iconAnimating = false;

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    addIcons({
      footballOutline,
      mailOutline,
      keyOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility() {
    this.iconAnimating = true;
    this.showPassword = !this.showPassword;

    setTimeout(() => {
      this.iconAnimating = false;
    }, 220);
  }

  async onSubmit() {
    this.loginForm.markAllAsTouched();

    if (this.loginForm.invalid) return;

    try {
      this.loading = true;

      const { email, password } = this.loginForm.getRawValue();
      console.log('Login submit', { email, password });

      await new Promise((resolve) => setTimeout(resolve, 900));
    } catch (error) {
      console.error('Error en login', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.loginForm.reset();
    this.loading = false;
    this.showPassword = false;
    this.iconAnimating = false;
  }
}
