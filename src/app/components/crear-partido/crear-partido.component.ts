import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonProgressBar } from '@ionic/angular/standalone';

import { environment } from '../../../enviroments/enviroment';
import { Pista } from '../../interfaces/Pista.interface';
import { NotificacionesService } from '../../services/notificaciones.service';
import { PartidoService } from '../../services/partido.service';
import {
  PaypalPaymentComponent,
  PagoCompletado,
} from '../paypal-payment/paypal-payment.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { StepFourComponent } from './step-four/step-four.component';
import { StepOneComponent } from './step-one/step-one.component';
import {
  HorarioSeleccionado,
  StepTwoComponent,
} from './step-two/step-two.component';
import {
  DatosPartido,
  StepThreeComponent,
} from './step-three/step-three.component';

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
    PaypalPaymentComponent,
  ],
})
export class CrearPartidoComponent {
  private router = inject(Router);
  private partidoService = inject(PartidoService);
  private notificacionesService = inject(NotificacionesService);

  currentStep = 1;
  created = false;
  inviteLink = '';
  stepAnimationClass = '';
  creatingMatch = false;

  pistaSeleccionada: Pista | null = null;
  fechaSeleccionada: Date | null = null;
  horaSeleccionada: string | null = null;

  datosPartidoPendientes: DatosPartido | null = null;

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
    if (this.requierePago) {
      this.datosPartidoPendientes = datos;
      return;
    }

    void this.createMatch(datos);
  }

  onPagoCompletado(pago: PagoCompletado): void {
    if (!this.datosPartidoPendientes) {
      return;
    }

    void this.createMatch(this.datosPartidoPendientes, pago);
    this.datosPartidoPendientes = null;
  }

  onPagoError(): void {
    console.error('[CREAR-PARTIDO] Error al procesar el pago');
  }

  cancelarPago(): void {
    this.datosPartidoPendientes = null;
  }

  volverAPistas(): void {
    this.currentStep = 1;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.datosPartidoPendientes = null;

    this.animateStep('backward');
  }

  volverACalendario(): void {
    this.currentStep = 2;
    this.datosPartidoPendientes = null;

    this.animateStep('backward');
  }

  async createMatch(
    datos?: DatosPartido,
    pago?: PagoCompletado,
  ): Promise<void> {
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
        ...(typeof this.pistaSeleccionada.precio === 'number'
          ? { precio: this.pistaSeleccionada.precio }
          : {}),
        ...(pago
          ? { paypalOrderId: pago.orderId, paypalPayerId: pago.payerId }
          : {}),
      });

      const inviteLink = `${this.getAppUrl()}/invitacion/${partidoId}`;

      await this.partidoService.guardarEnlaceInvitacion(partidoId, inviteLink);

      await this.notificacionesService.notificarPartidoCreado(
        datos.nombrePartido,
      );

      this.inviteLink = inviteLink;
      this.created = true;
      this.currentStep = 4;

      this.animateStep('forward');
    } catch (error) {
      console.error('[CREAR-PARTIDO] Error al crear partido:', error);

      const mensaje =
        error instanceof Error ? error.message : 'No se pudo crear el partido';

      if (mensaje.includes('ya está reservada')) {
        window.alert(
          '⚠️ Esta hora acaba de ser reservada por otro usuario. Elige otra franja.',
        );
      } else {
        window.alert('No se pudo crear el partido. Inténtalo de nuevo.');
      }
    } finally {
      this.creatingMatch = false;
    }
  }

  goHome(): void {
    void this.router.navigate(['/home']);
  }

  get requierePago(): boolean {
    return typeof this.pistaSeleccionada?.precio === 'number';
  }

  get precioPista(): number | null {
    return this.pistaSeleccionada?.precio ?? null;
  }

  get paypalEmailPista(): string {
    return (
      this.pistaSeleccionada?.paypalEmail ??
      environment.paypalDefaultEmail ??
      ''
    );
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
    this.datosPartidoPendientes = null;
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
