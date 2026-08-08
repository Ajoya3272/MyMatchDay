import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Pista } from '../../../interfaces/Pista.interface';

export interface DatosPartido {
  nombrePartido: string;
  equipoA: string;
  equipoB: string;
  playerCount: number;
}

@Component({
  selector: 'app-step-three',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './step-three.component.html',
  styleUrls: ['./step-three.component.scss'],
})
export class StepThreeComponent {
  private fb = inject(FormBuilder);

  @Input() pista: Pista | null = null;
  @Input() fecha: Date | null = null;
  @Input() hora: string | null = null;
  @Input() creatingMatch = false;

  @Output() datosConfirmados = new EventEmitter<DatosPartido>();

  @Output() volver = new EventEmitter<void>();

  form = this.fb.group({
    nombrePartido: ['', [Validators.required, Validators.maxLength(60)]],
    equipoA: ['', [Validators.required, Validators.maxLength(40)]],
    equipoB: ['', [Validators.required, Validators.maxLength(40)]],
    playerCount: [10, [Validators.required, Validators.min(2)]],
  });

  get nombrePartidoControl() {
    return this.form.controls.nombrePartido;
  }

  get equipoAControl() {
    return this.form.controls.equipoA;
  }

  get equipoBControl() {
    return this.form.controls.equipoB;
  }

  get playerCountControl() {
    return this.form.controls.playerCount;
  }

  get horarioResumen(): string {
    if (!this.fecha || !this.hora) {
      return '';
    }

    const fechaFormateada = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(this.fecha);

    const horaInicio = Number(this.hora);
    const horaFin = horaInicio + 1;

    return `${fechaFormateada} · ${this.hora}:00 - ${horaFin}:00`;
  }

  volverAlCalendario(): void {
    if (this.creatingMatch) {
      return;
    }

    this.volver.emit();
  }

  confirmarDatos(): void {
    if (this.creatingMatch) {
      return;
    }

    if (!this.validarFormulario()) {
      return;
    }

    const datos: DatosPartido = {
      nombrePartido: this.nombrePartidoControl.value?.trim() ?? '',
      equipoA: this.equipoAControl.value?.trim() ?? '',
      equipoB: this.equipoBControl.value?.trim() ?? '',
      playerCount: Number(this.playerCountControl.value ?? 10),
    };

    this.datosConfirmados.emit(datos);
  }

  private validarFormulario(): boolean {
    const { nombrePartido, equipoA, equipoB, playerCount } = this.form.controls;

    nombrePartido.markAsTouched();
    equipoA.markAsTouched();
    equipoB.markAsTouched();
    playerCount.markAsTouched();

    this.eliminarError(equipoB, 'sameTeamName');

    if (
      nombrePartido.invalid ||
      equipoA.invalid ||
      equipoB.invalid ||
      playerCount.invalid
    ) {
      return false;
    }

    const nombreEquipoA = equipoA.value?.trim().toLowerCase() ?? '';

    const nombreEquipoB = equipoB.value?.trim().toLowerCase() ?? '';

    if (nombreEquipoA && nombreEquipoA === nombreEquipoB) {
      equipoB.setErrors({
        ...(equipoB.errors ?? {}),
        sameTeamName: true,
      });

      return false;
    }

    return true;
  }

  private eliminarError(
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
}
