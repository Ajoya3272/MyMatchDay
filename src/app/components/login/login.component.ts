import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  eyeOffOutline,
  eyeOutline,
  footballOutline,
  keyOutline,
  mailOutline,
} from 'ionicons/icons';
import { LoginService } from '../../services/login.service';

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
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private loginService = inject(LoginService);

  loading = false;
  showPassword = false;
  iconAnimating = false;
  errorMessage = '';
  successMessage = '';

  loginForm = this.fb.nonNullable.group({
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

  ngOnInit(): void {
    const verified = this.route.snapshot.queryParamMap.get('verified');

    this.loginForm.reset({
      email: '',
      password: '',
    });

    this.errorMessage = '';
    this.showPassword = false;
    this.iconAnimating = false;
    this.successMessage = '';

    if (verified === '1') {
      this.successMessage =
        'Correo verificado correctamente. Ya puedes iniciar sesión.';
    }
  }

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  togglePasswordVisibility(): void {
    this.iconAnimating = true;
    this.showPassword = !this.showPassword;

    setTimeout(() => {
      this.iconAnimating = false;
    }, 220);
  }

  async onSubmit(): Promise<void> {
    this.loginForm.markAllAsTouched();
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.invalid) return;

    try {
      this.loading = true;

      const { email, password } = this.loginForm.getRawValue();

      await this.loginService.iniciarSesion({
        email: email.trim().toLowerCase(),
        password,
      });

      this.loginForm.reset({
        email: '',
        password: '',
      });

      await this.router.navigate(['/home']);
    } catch (error: any) {
      console.error('Error en login', error);

      switch (error?.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          this.errorMessage = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/email-not-verified':
          this.errorMessage =
            'Debes verificar tu correo antes de iniciar sesión.';
          break;
        case 'auth/too-many-requests':
          this.errorMessage =
            'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
          break;
        case 'auth/network-request-failed':
          this.errorMessage = 'Error de red. Revisa tu conexión.';
          break;
        default:
          this.errorMessage = 'No se pudo iniciar sesión.';
          break;
      }
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.loginForm.reset({
      email: '',
      password: '',
    });

    this.loading = false;
    this.showPassword = false;
    this.iconAnimating = false;
    this.errorMessage = '';
    this.successMessage = '';
  }
}
