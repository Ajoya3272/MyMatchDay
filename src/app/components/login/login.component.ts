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
import { Subscription } from 'rxjs';
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

  private queryParamsSub?: Subscription;

  loading = false;
  showPassword = false;
  iconAnimating = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '/home';

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
    this.loginForm.reset({
      email: '',
      password: '',
    });

    this.errorMessage = '';
    this.showPassword = false;
    this.iconAnimating = false;
    this.successMessage = '';

    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const verified = params.get('verified');
      const returnUrl = params.get('returnUrl');

      this.returnUrl = returnUrl || '/home';
      this.successMessage =
        verified === '1'
          ? 'Correo verificado correctamente. Ya puedes iniciar sesión.'
          : '';
    });
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
    this.successMessage =
      this.route.snapshot.queryParamMap.get('verified') === '1'
        ? 'Correo verificado correctamente. Ya puedes iniciar sesión.'
        : '';

    if (this.loginForm.invalid) {
      return;
    }

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

      await this.router.navigateByUrl(this.returnUrl);
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
    this.queryParamsSub?.unsubscribe();

    this.loginForm.reset({
      email: '',
      password: '',
    });

    this.loading = false;
    this.showPassword = false;
    this.iconAnimating = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.returnUrl = '/home';
  }
}
