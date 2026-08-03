import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonDatetime,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { PartidoService } from '../../services/partido.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { environment } from '../../../enviroments/enviroment';

@Component({
  selector: 'app-crear-partido',
  templateUrl: './crear-partido.component.html',
  styleUrls: ['./crear-partido.component.scss'],
  standalone: true,
  imports: [
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
    matchTime: ['', Validators.required],
    equipoA: ['', [Validators.required, Validators.maxLength(40)]],
    equipoB: ['', [Validators.required, Validators.maxLength(40)]],
    ubicacion: ['', [Validators.required, Validators.maxLength(100)]],
    playerCount: [10, [Validators.required, Validators.min(2)]],
    durationMinutes: [90, [Validators.required, Validators.min(1)]],
  });

  ionViewWillEnter(): void {
    this.minDateTime = this.getMinDateTime();
  }

  ionViewWillLeave(): void {
    this.resetCreateMatch();
  }

  onDateSelected(event: CustomEvent): void {
    const value = event.detail.value;

    if (!value) {
      this.form.controls.matchDate.setValue('');
      this.form.controls.matchDate.markAsTouched();
      return;
    }

    const selectedDate = Array.isArray(value) ? value[0] : value;
    const dateOnly = String(selectedDate).slice(0, 10);

    this.form.controls.matchDate.setValue(dateOnly);
    this.form.controls.matchDate.markAsTouched();
    this.clearControlError(this.form.controls.matchDate, 'pastDate');
  }

  nextStep(): void {
    this.minDateTime = this.getMinDateTime();

    this.form.controls.matchDate.markAsTouched();
    this.form.controls.matchTime.markAsTouched();

    if (
      this.form.controls.matchDate.invalid ||
      this.form.controls.matchTime.invalid
    ) {
      return;
    }

    this.clearControlError(this.form.controls.matchDate, 'pastDate');

    if (!this.isDateTimeValid()) {
      this.form.controls.matchDate.setErrors({
        ...(this.form.controls.matchDate.errors ?? {}),
        pastDate: true,
      });
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
      const ubicacion = this.form.controls.ubicacion.value?.trim() ?? '';

      const partidoId = await this.partidoService.crearPartido({
        matchDate: this.buildMatchDateTime(),
        equipoA,
        equipoB,
        ubicacion,
        playerCount: Number(this.form.controls.playerCount.value ?? 10),
        durationMinutes: Number(this.form.controls.durationMinutes.value ?? 90),
      });

      const inviteLink = `${this.getAppUrl()}/invitacion/${partidoId}`;

      await this.partidoService.guardarEnlaceInvitacion(partidoId, inviteLink);

      this.inviteLink = inviteLink;
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

  private getAppUrl(): string {
    const configuredUrl = environment.appUrl?.trim();

    if (configuredUrl) {
      return configuredUrl.replace(/\/+$/, '');
    }

    return window.location.origin.replace(/\/+$/, '');
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
      matchTime: '',
      equipoA: '',
      equipoB: '',
      ubicacion: '',
      playerCount: 10,
      durationMinutes: 90,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private validateStep2(): boolean {
    const { equipoA, equipoB, ubicacion, playerCount, durationMinutes } =
      this.form.controls;

    equipoA.markAsTouched();
    equipoB.markAsTouched();
    ubicacion.markAsTouched();
    playerCount.markAsTouched();
    durationMinutes.markAsTouched();

    this.clearControlError(equipoB, 'sameTeamName');

    if (
      equipoA.invalid ||
      equipoB.invalid ||
      ubicacion.invalid ||
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

  private buildMatchDateTime(): string {
    const date = this.form.controls.matchDate.value ?? '';
    const time = this.form.controls.matchTime.value ?? '';

    return `${date}T${time}:00`;
  }

  private isDateTimeValid(): boolean {
    const date = this.form.controls.matchDate.value;
    const time = this.form.controls.matchTime.value;

    if (!date || !time) {
      return false;
    }

    const selectedDate = new Date(`${date}T${time}:00`);
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
