import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { IonDatetime } from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';

import { Pista } from '../../../interfaces/Pista.interface';
import { PistaService } from '../../../services/pista.service';

interface PartidoFechaDoc {
  fecha?: Timestamp;
  estado?: string;
}

interface FranjaHoraria {
  hora: string;
  label: string;
  ocupada: boolean;
}

export interface HorarioSeleccionado {
  fecha: Date;
  hora: string;
}

const FRANJAS_HORARIAS = ['17', '18', '19', '20', '21'];
const PREFIJO_UBICACION_MANUAL = 'manual-';

@Component({
  selector: 'app-step-two',
  standalone: true,
  imports: [CommonModule, IonDatetime],
  templateUrl: './step-two.component.html',
  styleUrls: ['./step-two.component.scss'],
})
export class StepTwoComponent implements OnInit, OnChanges, OnDestroy {
  private pistaService = inject(PistaService);
  private destroy$ = new Subject<void>();

  @Input() pista: Pista | null = null;

  @Output() horarioSeleccionado = new EventEmitter<HorarioSeleccionado>();
  @Output() volver = new EventEmitter<void>();

  cargandoDisponibilidad = false;
  fechaSeleccionada: Date | null = null;
  horaSeleccionada: string | null = null;

  private horasOcupadasPorFecha = new Map<string, Set<string>>();

  ngOnInit(): void {
    if (this.pista) {
      this.cargarDisponibilidad(this.pista);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const pistaChange = changes['pista'];

    if (
      pistaChange &&
      pistaChange.currentValue &&
      pistaChange.currentValue !== pistaChange.previousValue
    ) {
      this.cargarDisponibilidad(pistaChange.currentValue);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarDisponibilidad(pista: Pista): void {
    this.fechaSeleccionada = null;
    this.horaSeleccionada = null;
    this.horasOcupadasPorFecha = new Map();

    if (this.esUbicacionManual(pista)) {
      this.cargandoDisponibilidad = false;
      return;
    }

    this.cargandoDisponibilidad = true;

    this.pistaService
      .obtenerPartidosDePista(pista.pistaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (partidos) => {
          this.horasOcupadasPorFecha = this.construirMapaOcupacion(partidos);

          this.comprobarHoraSeleccionada();
          this.cargandoDisponibilidad = false;
        },
        error: (error) => {
          console.error('[STEP-TWO] Error cargando disponibilidad:', error);

          this.horasOcupadasPorFecha = new Map();
          this.cargandoDisponibilidad = false;
        },
      });
  }

  volverAlPasoUno(): void {
    this.volver.emit();
  }

  isDateEnabledFn = (dateIsoString: string): boolean => {
    const fecha = new Date(dateIsoString);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    fecha.setHours(0, 0, 0, 0);

    if (fecha.getTime() < hoy.getTime()) {
      return false;
    }

    return this.contarOcupadas(fecha) < FRANJAS_HORARIAS.length;
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

  get tienePrecio(): boolean {
    return typeof this.pista?.precio === 'number';
  }

  get precioFormateado(): string {
    if (!this.tienePrecio) {
      return '';
    }

    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(this.pista!.precio!);
  }

  trackByHora(_index: number, franja: FranjaHoraria): string {
    return franja.hora;
  }

  seleccionarHoraDesdePointer(
    event: PointerEvent,
    franja: FranjaHoraria,
  ): void {
    event.preventDefault();
    event.stopPropagation();

    this.seleccionarHora(franja);
  }

  seleccionarHora(franja: FranjaHoraria): void {
    if (franja.ocupada) {
      return;
    }

    this.horaSeleccionada = franja.hora;
  }

  continuar(): void {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      return;
    }

    this.horarioSeleccionado.emit({
      fecha: this.fechaSeleccionada,
      hora: this.horaSeleccionada,
    });
  }

  private comprobarHoraSeleccionada(): void {
    if (!this.fechaSeleccionada || !this.horaSeleccionada) {
      return;
    }

    const clave = this.claveFecha(this.fechaSeleccionada);
    const ocupadas = this.horasOcupadasPorFecha.get(clave);

    if (ocupadas?.has(this.horaSeleccionada)) {
      this.horaSeleccionada = null;
    }
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
      if (partido.estado === 'cancelado' || partido.estado === 'finalizado') {
        continue;
      }

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

  private esUbicacionManual(pista: Pista): boolean {
    return pista.pistaId.startsWith(PREFIJO_UBICACION_MANUAL);
  }
}
