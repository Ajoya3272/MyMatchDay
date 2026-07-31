import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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
  personOutline,
} from 'ionicons/icons';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';

import { RegistroUsuarioService } from '../../services/registro-usuario.service';

type SexoUsuario = 'hombre' | 'mujer';

function isSexoUsuario(value: string): value is SexoUsuario {
  return value === 'hombre' || value === 'mujer';
}

const passwordsMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordsMismatch: true };
};

@Component({
  selector: 'app-registro-usuario',
  templateUrl: './registro-usuario.component.html',
  styleUrls: ['./registro-usuario.component.scss'],
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
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
})
export class RegistroUsuarioComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private registroUsuarioService = inject(RegistroUsuarioService);

  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  passwordIconAnimating = false;
  confirmPasswordIconAnimating = false;
  errorMessage = '';

  registerForm = this.fb.group(
    {
      nombre: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      email: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.email,
      ]),
      sexo: this.fb.nonNullable.control<SexoUsuario | ''>('', [
        Validators.required,
      ]),
      fechaNacimiento: this.fb.control<Date | null>(null, [
        Validators.required,
      ]),
      password: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.minLength(6),
      ]),
      confirmPassword: this.fb.nonNullable.control('', [Validators.required]),
    },
    {
      validators: passwordsMatchValidator,
    },
  );

  constructor() {
    addIcons({
      footballOutline,
      personOutline,
      mailOutline,
      keyOutline,
      eyeOutline,
      eyeOffOutline,
    });
  }

  get nombre() {
    return this.registerForm.controls.nombre;
  }

  get email() {
    return this.registerForm.controls.email;
  }

  get sexo() {
    return this.registerForm.controls.sexo;
  }

  get fechaNacimiento() {
    return this.registerForm.controls.fechaNacimiento;
  }

  get password() {
    return this.registerForm.controls.password;
  }

  get confirmPassword() {
    return this.registerForm.controls.confirmPassword;
  }

  get passwordsDoNotMatch() {
    return (
      this.registerForm.hasError('passwordsMismatch') &&
      (this.password.touched || this.confirmPassword.touched)
    );
  }

  togglePasswordVisibility(): void {
    this.passwordIconAnimating = true;
    this.showPassword = !this.showPassword;

    setTimeout(() => {
      this.passwordIconAnimating = false;
    }, 220);
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordIconAnimating = true;
    this.showConfirmPassword = !this.showConfirmPassword;

    setTimeout(() => {
      this.confirmPasswordIconAnimating = false;
    }, 220);
  }

  private formatFechaNacimiento(fecha: Date | null): string {
    if (!fecha) return '';

    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async onSubmit(): Promise<void> {
    this.registerForm.markAllAsTouched();
    this.errorMessage = '';

    if (this.registerForm.invalid) return;

    const formValue = this.registerForm.getRawValue();

    if (!isSexoUsuario(formValue.sexo)) {
      this.errorMessage = 'Selecciona un sexo válido.';
      return;
    }

    const fechaNacimientoFormateada = this.formatFechaNacimiento(
      formValue.fechaNacimiento,
    );

    if (!fechaNacimientoFormateada) {
      this.errorMessage = 'Selecciona una fecha de nacimiento válida.';
      return;
    }

    try {
      this.loading = true;

      await this.registroUsuarioService.registrarUsuario({
        nombre: formValue.nombre.trim(),
        email: formValue.email.trim().toLowerCase(),
        password: formValue.password,
        sexo: formValue.sexo,
        fechaNacimiento: fechaNacimientoFormateada,
      });

      await this.router.navigate(['/verificacion-usuario'], {
        queryParams: { email: formValue.email.trim().toLowerCase() },
      });
    } catch (error: any) {
      console.error('Error en registro', error);

      switch (error?.code) {
        case 'auth/email-already-in-use':
          this.errorMessage = 'Ese correo ya está registrado.';
          break;
        case 'auth/invalid-email':
          this.errorMessage = 'El correo no es válido.';
          break;
        case 'auth/weak-password':
          this.errorMessage = 'La contraseña es demasiado débil.';
          break;
        case 'auth/network-request-failed':
          this.errorMessage = 'Error de red. Revisa tu conexión.';
          break;
        default:
          this.errorMessage = 'No se pudo crear la cuenta. Inténtalo de nuevo.';
          break;
      }
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.registerForm.reset({
      nombre: '',
      email: '',
      sexo: '',
      fechaNacimiento: null,
      password: '',
      confirmPassword: '',
    });

    this.loading = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.passwordIconAnimating = false;
    this.confirmPasswordIconAnimating = false;
    this.errorMessage = '';
  }
}
