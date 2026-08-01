import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonDatetime,
  IonProgressBar,
  IonDatetimeButton,
  IonModal,
} from '@ionic/angular/standalone';
import { PartidoService } from '../../services/partido.service';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-crear-partido',
  templateUrl: './crear-partido.component.html',
  styleUrls: ['./crear-partido.component.scss'],
  standalone: true,
  imports: [
    IonModal,
    IonDatetimeButton,
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonDatetime,
    IonProgressBar,
    SpinnerComponent,
  ],
})
export class CrearPartidoComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private partidoService = inject(PartidoService);

  currentStep = 1;
  created = false;
  inviteLink = '';
  stepAnimationClass = '';
  minDateTime = this.getMinDateTime();
  linkCopied = false;
  creatingMatch = false;
  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  form = this.fb.group({
    matchDate: ['', Validators.required],
    equipoA: ['', [Validators.required, Validators.maxLength(40)]],
    equipoB: ['', [Validators.required, Validators.maxLength(40)]],
    playerCount: [10, [Validators.required, Validators.min(2)]],
    durationMinutes: [90, [Validators.required, Validators.min(1)]],
  });

  ionViewWillEnter(): void {
    this.minDateTime = this.getMinDateTime();
  }

  ionViewWillLeave(): void {
    this.resetCreateMatch();
  }

  nextStep(): void {
    this.minDateTime = this.getMinDateTime();
    this.form.controls.matchDate.markAsTouched();

    if (this.form.controls.matchDate.invalid) {
      return;
    }

    if (!this.isDateTimeValid()) {
      this.form.controls.matchDate.setErrors({ pastDate: true });
      return;
    }

    this.currentStep = 2;
    this.animateStep('forward');
  }

  prevStep(): void {
    this.currentStep = 1;
    this.animateStep('backward');
  }

  async createMatch(): Promise<void> {
    if (!this.validateStep2() || this.creatingMatch) {
      return;
    }

    try {
      this.creatingMatch = true;

      const equipoA = this.form.controls.equipoA.value?.trim() ?? '';
      const equipoB = this.form.controls.equipoB.value?.trim() ?? '';

      const partidoId = await this.partidoService.crearPartido({
        matchDate: this.form.controls.matchDate.value ?? '',
        equipoA,
        equipoB,
        playerCount: Number(this.form.controls.playerCount.value ?? 10),
        durationMinutes: Number(this.form.controls.durationMinutes.value ?? 90),
      });

      this.inviteLink = `${window.location.origin}/invitacion/${partidoId}`;
      this.created = true;
      this.currentStep = 3;
      this.linkCopied = false;
      this.animateStep('forward');
    } catch (error) {
      console.error('Error al crear partido:', error);
    } finally {
      this.creatingMatch = false;
    }
  }

  async copyInvite(): Promise<void> {
    if (!this.inviteLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.linkCopied = true;

      if (this.copyFeedbackTimeout) {
        clearTimeout(this.copyFeedbackTimeout);
      }

      this.copyFeedbackTimeout = setTimeout(() => {
        this.linkCopied = false;
      }, 3000);
    } catch {
      this.linkCopied = false;
    }
  }

  goHome(): void {
    this.resetCreateMatch();
    this.router.navigate(['/home']);
  }

  private resetCreateMatch(): void {
    this.currentStep = 1;
    this.created = false;
    this.inviteLink = '';
    this.stepAnimationClass = '';
    this.minDateTime = this.getMinDateTime();
    this.linkCopied = false;
    this.creatingMatch = false;

    if (this.copyFeedbackTimeout) {
      clearTimeout(this.copyFeedbackTimeout);
      this.copyFeedbackTimeout = null;
    }

    this.form.reset({
      matchDate: '',
      equipoA: '',
      equipoB: '',
      playerCount: 10,
      durationMinutes: 90,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private validateStep2(): boolean {
    const { equipoA, equipoB, playerCount, durationMinutes } =
      this.form.controls;

    equipoA.markAsTouched();
    equipoB.markAsTouched();
    playerCount.markAsTouched();
    durationMinutes.markAsTouched();

    this.clearControlError(equipoB, 'sameTeamName');

    if (
      equipoA.invalid ||
      equipoB.invalid ||
      playerCount.invalid ||
      durationMinutes.invalid
    ) {
      return false;
    }

    if (
      equipoA.value?.trim().toLowerCase() ===
      equipoB.value?.trim().toLowerCase()
    ) {
      equipoB.setErrors({
        ...(equipoB.errors ?? {}),
        sameTeamName: true,
      });
      return false;
    }

    return true;
  }

  private clearControlError(control: any, errorKey: string): void {
    if (!control.errors?.[errorKey]) {
      return;
    }

    const errors = { ...control.errors };
    delete errors[errorKey];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  private isDateTimeValid(): boolean {
    const selectedValue = this.form.controls.matchDate.value;

    if (!selectedValue) {
      return false;
    }

    const selectedDate = new Date(selectedValue);
    const currentDate = new Date();

    return selectedDate.getTime() >= currentDate.getTime();
  }

  private getMinDateTime(): string {
    const now = new Date();
    now.setSeconds(0, 0);

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:00`;
  }

  private animateStep(direction: 'forward' | 'backward'): void {
    this.stepAnimationClass = '';

    requestAnimationFrame(() => {
      this.stepAnimationClass =
        direction === 'forward' ? 'step-enter-forward' : 'step-enter-backward';
    });
  }

  get progressValue(): number {
    if (this.currentStep === 1) {
      return 1 / 3;
    }

    if (this.currentStep === 2) {
      return 2 / 3;
    }

    return 1;
  }
}
