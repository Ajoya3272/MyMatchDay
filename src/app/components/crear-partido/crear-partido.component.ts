import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonProgressBar } from '@ionic/angular/standalone';

import { PartidoService } from '../../services/partido.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { StepOneComponent } from './step-one/step-one.component';
import {
  HorarioSeleccionado,
  StepTwoComponent,
} from './step-two/step-two.component';
import {
  DatosPartido,
  StepThreeComponent,
} from './step-three/step-three.component';
import { StepFourComponent } from './step-four/step-four.component';
import { environment } from '../../../enviroments/enviroment';
import { Pista } from '../../interfaces/Pista.interface';

const DURACION_MINUTOS_FIJA = 60;

@Component({
  selector: 'app-crear-partido',
  templateUrl: './crear-partido.component.html',
  styleUrls: ['./crear-partido.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonProgressBar,
    SpinnerComponent,
    StepOneComponent,
    StepTwoComponent,
    StepThreeComponent,
    StepFourComponent,
  ],
})
export class CrearPartidoComponent {
  private router = inject(Router);
  private partidoService = inject(PartidoService);

  currentStep = 1;
  created = false;
  inviteLink = '';
  stepAnimationClass = '';
  creatingMatch = false;

  pistaSeleccionada: Pista | null = null;
  fechaSeleccionada: Date | null = null;
  horaSeleccionada: string | null = null;

  ionViewDidLeave(): void {
    this.resetCreateMatch();
  }

  onPistaSeleccionada(pista: Pista): void {
    this.pistaSeleccionada = pista;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.currentStep = 2;

    this.animateStep('forward');
  }

  onHorarioSeleccionado(horario: HorarioSeleccionado): void {
    this.fechaSeleccionada = horario.fecha;
    this.horaSeleccionada = horario.hora;
    this.currentStep = 3;

    this.animateStep('forward');
  }

  onDatosPartidoConfirmados(datos: DatosPartido): void {
    void this.createMatch(datos);
  }

  volverAPistas(): void {
    this.currentStep = 1;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;

    this.animateStep('backward');
  }

  volverACalendario(): void {
    this.currentStep = 2;

    this.animateStep('backward');
  }

  async createMatch(datos?: DatosPartido): Promise<void> {
    if (this.creatingMatch) {
      return;
    }

    if (
      !this.pistaSeleccionada ||
      !this.fechaSeleccionada ||
      !this.horaSeleccionada ||
      !datos
    ) {
      return;
    }

    try {
      this.creatingMatch = true;

      const ubicacion =
        `${this.pistaSeleccionada.nombre}, ` +
        `${this.pistaSeleccionada.localidad}`;

      const partidoId = await this.partidoService.crearPartido({
        matchDate: this.buildMatchDateTime(),
        nombrePartido: datos.nombrePartido,
        equipoA: datos.equipoA,
        equipoB: datos.equipoB,
        ubicacion,
        playerCount: datos.playerCount,
        durationMinutes: DURACION_MINUTOS_FIJA,
        pistaId: this.pistaSeleccionada.pistaId,
        pistaNombre: this.pistaSeleccionada.nombre,
      });

      const inviteLink = `${this.getAppUrl()}/invitacion/${partidoId}`;

      await this.partidoService.guardarEnlaceInvitacion(partidoId, inviteLink);

      this.inviteLink = inviteLink;
      this.created = true;
      this.currentStep = 4;

      this.animateStep('forward');
    } catch (error) {
      console.error('[CREAR-PARTIDO] Error al crear partido:', error);
    } finally {
      this.creatingMatch = false;
    }
  }

  goHome(): void {
    void this.router.navigate(['/home']);
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
    this.creatingMatch = false;

    this.pistaSeleccionada = null;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
  }

  private buildMatchDateTime(): string {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      return '';
    }

    const year = this.fechaSeleccionada.getFullYear();

    const month = String(this.fechaSeleccionada.getMonth() + 1).padStart(
      2,
      '0',
    );

    const day = String(this.fechaSeleccionada.getDate()).padStart(2, '0');

    const hour = this.horaSeleccionada.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:00:00`;
  }

  private animateStep(direction: 'forward' | 'backward'): void {
    this.stepAnimationClass = '';

    requestAnimationFrame(() => {
      this.stepAnimationClass =
        direction === 'forward' ? 'step-enter-forward' : 'step-enter-backward';
    });
  }

  get progressValue(): number {
    return this.currentStep / 4;
  }
}
