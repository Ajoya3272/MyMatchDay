import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonDatetime,
  IonProgressBar,
} from '@ionic/angular/standalone';
import { Timestamp } from '@angular/fire/firestore';
import { take } from 'rxjs';

import { PartidoService } from '../../services/partido.service';
import { PistaService } from '../../services/pista.service';
import { UbicacionService } from '../../services/ubicacion.service';
import { SpinnerComponent } from '../spinner/spinner.component';
import { environment } from '../../../enviroments/enviroment';
import { Pista } from '../../interfaces/Pista.interface';
import {
  MunicipioIne,
  ProvinciaIne,
} from '../../interfaces/ubicacion.interface';

interface FranjaHoraria {
  hora: string;
  label: string;
  ocupada: boolean;
}

interface PartidoFechaDoc {
  fecha?: Timestamp;
}

const FRANJAS_HORARIAS = ['17', '18', '19', '20', '21'];
const DURACION_MINUTOS_FIJA = 60;

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
    FormsModule,
  ],
})
export class CrearPartidoComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private partidoService = inject(PartidoService);
  private pistaService = inject(PistaService);
  private ubicacionService = inject(UbicacionService);

  currentStep = 1;
  created = false;
  inviteLink = '';
  stepAnimationClass = '';
  linkCopied = false;
  creatingMatch = false;

  private copyFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  // ---------- Paso 1: selección de pista ----------

  pistas: Pista[] = [];
  cargandoPistas = true;

  provincias: ProvinciaIne[] = [];
  municipios: MunicipioIne[] = [];
  cargandoMunicipios = false;

  provinciaSeleccionadaId = '';
  municipioSeleccionadoId = '';
  pistaSeleccionada: Pista | null = null;

  // ---------- Paso 2: fecha y hora ----------

  cargandoDisponibilidad = false;
  fechaSeleccionada: Date | null = null;
  horaSeleccionada: string | null = null;

  private horasOcupadasPorFecha = new Map<string, Set<string>>();

  // ---------- Paso 3: datos del partido ----------

  form = this.fb.group({
    nombrePartido: ['', [Validators.required, Validators.maxLength(60)]],
    equipoA: ['', [Validators.required, Validators.maxLength(40)]],
    equipoB: ['', [Validators.required, Validators.maxLength(40)]],
    playerCount: [10, [Validators.required, Validators.min(2)]],
  });

  ionViewWillEnter(): void {
    this.cargarPistas();
    this.cargarProvincias();
  }

  ionViewWillLeave(): void {
    this.resetCreateMatch();
  }

  // ---------- Paso 1: pistas ----------

  private cargarPistas(): void {
    this.cargandoPistas = true;

    this.pistaService.obtenerPistas().subscribe({
      next: (pistas) => {
        this.pistas = pistas;
        this.cargandoPistas = false;
      },
      error: (error) => {
        console.error('[CREAR-PARTIDO] Error cargando pistas:', error);

        this.pistas = [];
        this.cargandoPistas = false;
      },
    });
  }

  private async cargarProvincias(): Promise<void> {
    this.provincias = await this.ubicacionService.obtenerProvincias();
  }

  async seleccionarProvincia(provinciaId: string): Promise<void> {
    this.provinciaSeleccionadaId = provinciaId;
    this.municipioSeleccionadoId = '';
    this.pistaSeleccionada = null;
    this.municipios = [];

    if (!provinciaId) {
      return;
    }

    this.cargandoMunicipios = true;

    this.municipios =
      await this.ubicacionService.obtenerMunicipiosDeProvincia(provinciaId);

    this.cargandoMunicipios = false;
  }

  seleccionarMunicipio(municipioId: string): void {
    this.municipioSeleccionadoId = municipioId;
    this.pistaSeleccionada = null;
  }

  get provinciaNombreSeleccionada(): string {
    return (
      this.provincias.find(
        (provincia) => provincia.provincia_id === this.provinciaSeleccionadaId,
      )?.nombre ?? ''
    );
  }

  get municipioNombreSeleccionado(): string {
    return (
      this.municipios.find(
        (municipio) => municipio.municipio_id === this.municipioSeleccionadoId,
      )?.nombre ?? ''
    );
  }

  get pistasEncontradas(): Pista[] {
    if (!this.provinciaSeleccionadaId || !this.municipioSeleccionadoId) {
      return [];
    }

    const provinciaSeleccionada = this.normalizar(
      this.provinciaNombreSeleccionada,
    );

    const municipioSeleccionado = this.normalizar(
      this.municipioNombreSeleccionado,
    );

    return this.pistas.filter((pista) => {
      const provinciaPista = this.normalizar(pista.provincia);

      const municipioPista = this.normalizar(pista.localidad);

      return (
        provinciaPista === provinciaSeleccionada &&
        municipioPista === municipioSeleccionado
      );
    });
  }

  private normalizar(texto?: string | null): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  seleccionarPista(pista: Pista): void {
    this.pistaSeleccionada = pista;
    this.cargandoDisponibilidad = true;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;

    this.pistaService
      .obtenerPartidosDePista(pista.pistaId)
      .pipe(take(1))
      .subscribe({
        next: (partidos) => {
          this.horasOcupadasPorFecha = this.construirMapaOcupacion(partidos);

          this.cargandoDisponibilidad = false;
          this.currentStep = 2;
          this.animateStep('forward');
        },
        error: (error) => {
          console.error(
            '[CREAR-PARTIDO] Error cargando disponibilidad:',
            error,
          );

          this.horasOcupadasPorFecha = new Map();
          this.cargandoDisponibilidad = false;
          this.currentStep = 2;
          this.animateStep('forward');
        },
      });
  }

  volverAPistas(): void {
    this.currentStep = 1;
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.animateStep('backward');
  }

  // ---------- Paso 2: calendario y franjas ----------

  isDateEnabledFn = (dateIsoString: string): boolean => {
    const fecha = new Date(dateIsoString);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    fecha.setHours(0, 0, 0, 0);

    if (fecha.getTime() < hoy.getTime()) {
      return false;
    }

    const ocupadas = this.contarOcupadas(fecha);

    return ocupadas < FRANJAS_HORARIAS.length;
  };

  highlightedDatesFn = (
    dateIsoString: string,
  ):
    | {
        textColor: string;
        backgroundColor: string;
      }
    | undefined => {
    const fecha = new Date(dateIsoString);
    const ocupadas = this.contarOcupadas(fecha);

    if (ocupadas >= FRANJAS_HORARIAS.length) {
      return {
        textColor: '#991b1b',
        backgroundColor: '#fecaca',
      };
    }

    if (ocupadas > 0) {
      return {
        textColor: '#92400e',
        backgroundColor: '#fef3c7',
      };
    }

    return undefined;
  };

  onFechaSeleccionada(event: CustomEvent): void {
    const value = event.detail.value;

    if (!value) {
      this.fechaSeleccionada = null;
      this.horaSeleccionada = null;
      return;
    }

    const iso = Array.isArray(value) ? value[0] : value;

    this.fechaSeleccionada = new Date(`${String(iso).slice(0, 10)}T00:00:00`);

    this.horaSeleccionada = null;
  }

  get franjasDelDia(): FranjaHoraria[] {
    if (!this.fechaSeleccionada) {
      return [];
    }

    const clave = this.claveFecha(this.fechaSeleccionada);

    const ocupadas = this.horasOcupadasPorFecha.get(clave) ?? new Set<string>();

    return FRANJAS_HORARIAS.map((hora) => ({
      hora,
      label: `${hora}:00 - ${Number(hora) + 1}:00`,
      ocupada: ocupadas.has(hora),
    }));
  }

  seleccionarHora(franja: FranjaHoraria): void {
    if (franja.ocupada) {
      return;
    }

    this.horaSeleccionada = franja.hora;
  }

  continuarDesdeHorario(): void {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      return;
    }

    this.currentStep = 3;
    this.animateStep('forward');
  }

  volverACalendario(): void {
    this.currentStep = 2;
    this.animateStep('backward');
  }

  private contarOcupadas(fecha: Date): number {
    const clave = this.claveFecha(fecha);

    return this.horasOcupadasPorFecha.get(clave)?.size ?? 0;
  }

  private construirMapaOcupacion(
    partidos: PartidoFechaDoc[],
  ): Map<string, Set<string>> {
    const mapa = new Map<string, Set<string>>();

    for (const partido of partidos) {
      const fecha = partido.fecha?.toDate?.();

      if (!fecha) {
        continue;
      }

      const clave = this.claveFecha(fecha);
      const hora = String(fecha.getHours());

      if (!mapa.has(clave)) {
        mapa.set(clave, new Set<string>());
      }

      mapa.get(clave)!.add(hora);
    }

    return mapa;
  }

  private claveFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // ---------- Paso 3: datos del partido ----------

  async createMatch(): Promise<void> {
    if (!this.validateStep3() || this.creatingMatch) {
      return;
    }

    if (
      !this.pistaSeleccionada ||
      !this.fechaSeleccionada ||
      !this.horaSeleccionada
    ) {
      return;
    }

    try {
      this.creatingMatch = true;

      const nombrePartido =
        this.form.controls.nombrePartido.value?.trim() ?? '';

      const equipoA = this.form.controls.equipoA.value?.trim() ?? '';

      const equipoB = this.form.controls.equipoB.value?.trim() ?? '';

      const ubicacion = `${this.pistaSeleccionada.nombre}, ${this.pistaSeleccionada.localidad}`;

      const partidoId = await this.partidoService.crearPartido({
        matchDate: this.buildMatchDateTime(),
        nombrePartido,
        equipoA,
        equipoB,
        ubicacion,
        playerCount: Number(this.form.controls.playerCount.value ?? 10),
        durationMinutes: DURACION_MINUTOS_FIJA,
        pistaId: this.pistaSeleccionada.pistaId,
        pistaNombre: this.pistaSeleccionada.nombre,
      });

      const inviteLink = `${this.getAppUrl()}/invitacion/${partidoId}`;

      await this.partidoService.guardarEnlaceInvitacion(partidoId, inviteLink);

      this.inviteLink = inviteLink;
      this.created = true;
      this.currentStep = 4;
      this.linkCopied = false;

      this.animateStep('forward');
    } catch (error) {
      console.error('[CREAR-PARTIDO] Error al crear partido:', error);
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
    } catch (error) {
      console.error('[CREAR-PARTIDO] Error copiando enlace:', error);

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
    this.linkCopied = false;
    this.creatingMatch = false;

    this.provinciaSeleccionadaId = '';
    this.municipioSeleccionadoId = '';
    this.municipios = [];
    this.pistaSeleccionada = null;

    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.horasOcupadasPorFecha = new Map();

    if (this.copyFeedbackTimeout) {
      clearTimeout(this.copyFeedbackTimeout);
      this.copyFeedbackTimeout = null;
    }

    this.form.reset({
      nombrePartido: '',
      equipoA: '',
      equipoB: '',
      playerCount: 10,
    });

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  private validateStep3(): boolean {
    const { nombrePartido, equipoA, equipoB, playerCount } = this.form.controls;

    nombrePartido.markAsTouched();
    equipoA.markAsTouched();
    equipoB.markAsTouched();
    playerCount.markAsTouched();

    this.clearControlError(equipoB, 'sameTeamName');

    if (
      nombrePartido.invalid ||
      equipoA.invalid ||
      equipoB.invalid ||
      playerCount.invalid
    ) {
      return false;
    }

    const nombreEquipoA = equipoA.value?.trim().toLowerCase();

    const nombreEquipoB = equipoB.value?.trim().toLowerCase();

    if (nombreEquipoA === nombreEquipoB) {
      equipoB.setErrors({
        ...(equipoB.errors ?? {}),
        sameTeamName: true,
      });

      return false;
    }

    return true;
  }

  private clearControlError(
    control: {
      errors: Record<string, unknown> | null;
      setErrors: (errors: Record<string, unknown> | null) => void;
    },
    errorKey: string,
  ): void {
    if (!control.errors?.[errorKey]) {
      return;
    }

    const errors = { ...control.errors };
    delete errors[errorKey];

    control.setErrors(Object.keys(errors).length > 0 ? errors : null);
  }

  private buildMatchDateTime(): string {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      return '';
    }

    const clave = this.claveFecha(this.fechaSeleccionada);
    const hora = this.horaSeleccionada.padStart(2, '0');

    return `${clave}T${hora}:00:00`;
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
