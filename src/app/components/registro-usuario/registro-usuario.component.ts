import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
  NonNullableFormBuilder,
} from '@angular/forms';
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
  personOutline,
  mailOutline,
  keyOutline,
  eyeOutline,
  eyeOffOutline,
} from 'ionicons/icons';

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
  ],
})
export class RegistroUsuarioComponent implements OnDestroy {
  private fb = inject(NonNullableFormBuilder);

  loading = false;
  showPassword = false;
  showConfirmPassword = false;
  passwordIconAnimating = false;
  confirmPasswordIconAnimating = false;

  registerForm = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
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

  get password() {
    return this.registerForm.controls.password;
  }

  get confirmPassword() {
    return this.registerForm.controls.confirmPassword;
  }

  get passwordsDoNotMatch() {
    return (
      this.registerForm.hasError('passwordsMismatch') &&
      this.confirmPassword.touched
    );
  }

  togglePasswordVisibility() {
    this.passwordIconAnimating = true;
    this.showPassword = !this.showPassword;

    setTimeout(() => {
      this.passwordIconAnimating = false;
    }, 220);
  }

  toggleConfirmPasswordVisibility() {
    this.confirmPasswordIconAnimating = true;
    this.showConfirmPassword = !this.showConfirmPassword;

    setTimeout(() => {
      this.confirmPasswordIconAnimating = false;
    }, 220);
  }

  async onSubmit() {
    this.registerForm.markAllAsTouched();

    if (this.registerForm.invalid) return;

    try {
      this.loading = true;

      const formValue = this.registerForm.getRawValue();
      console.log('Registro submit', formValue);

      await new Promise((resolve) => setTimeout(resolve, 900));
    } catch (error) {
      console.error('Error en registro', error);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.registerForm.reset({
      nombre: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
    this.loading = false;
    this.showPassword = false;
    this.showConfirmPassword = false;
    this.passwordIconAnimating = false;
    this.confirmPasswordIconAnimating = false;
  }
}
