import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonDatetime,
  IonProgressBar,
  IonDatetimeButton,
  IonModal,
} from '@ionic/angular/standalone';

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
  ],
})
export class CrearPartidoComponent {
  currentStep = 1;
  created = false;
  inviteLink = '';
  stepAnimationClass = '';
  minDateTime = this.getMinDateTime();
  linkCopied = false;
  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  form = this.fb.group({
    matchDate: ['', Validators.required],
    matchName: ['', [Validators.required, Validators.maxLength(60)]],
    minPlayers: [0, [Validators.required, Validators.min(0)]],
    maxPlayers: [10, [Validators.required, Validators.min(1)]],
    durationMinutes: [90, [Validators.required, Validators.min(1)]],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
  ) {}

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

  createMatch(): void {
    if (!this.validateStep2()) {
      return;
    }

    const matchName = this.form.controls.matchName.value ?? 'partido';

    const slugBase = matchName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9áéíóúüñ\s-]/gi, '')
      .replace(/\s+/g, '-');

    const finalSlug = `${slugBase || 'partido'}-${Date.now()}`;

    this.inviteLink = `${window.location.origin}/invitacion/${finalSlug}`;
    this.created = true;
    this.currentStep = 3;
    this.linkCopied = false;
    this.animateStep('forward');
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

    if (this.copyFeedbackTimeout) {
      clearTimeout(this.copyFeedbackTimeout);
      this.copyFeedbackTimeout = null;
    }

    this.form.reset({
      matchDate: '',
      matchName: '',
      minPlayers: 0,
      maxPlayers: 10,
      durationMinutes: 90,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private validateStep2(): boolean {
    const { matchName, minPlayers, maxPlayers, durationMinutes } =
      this.form.controls;

    matchName.markAsTouched();
    minPlayers.markAsTouched();
    maxPlayers.markAsTouched();
    durationMinutes.markAsTouched();

    minPlayers.setErrors(null);
    maxPlayers.setErrors(null);

    if (
      matchName.invalid ||
      minPlayers.invalid ||
      maxPlayers.invalid ||
      durationMinutes.invalid
    ) {
      return false;
    }

    const min = Number(minPlayers.value);
    const max = Number(maxPlayers.value);

    if (min > max) {
      minPlayers.setErrors({ minGreaterThanMax: true });
      maxPlayers.setErrors({ maxLowerThanMin: true });
      return false;
    }

    return true;
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
