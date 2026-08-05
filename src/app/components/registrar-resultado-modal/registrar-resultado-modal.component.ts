import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular/standalone';
import { Partido } from '../../interfaces/Partido.interface';
import {
  JugadorPartidoSelectable,
  ResultadoPartidoFirestoreWrite,
} from '../../interfaces/Registro-resultado.interface';

interface JugadorConStats extends JugadorPartidoSelectable {
  goles: number;
  asistencias: number;
}

@Component({
  selector: 'app-registrar-resultado-modal',
  templateUrl: './registrar-resultado-modal.component.html',
  styleUrls: ['./registrar-resultado-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, FormsModule],
})
export class RegistrarResultadoModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() loading = false;
  @Input() partido: Partido | null = null;
  @Input() jugadores: JugadorPartidoSelectable[] = [];

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<ResultadoPartidoFirestoreWrite>();

  golesEquipoA = 0;
  golesEquipoB = 0;

  jugadoresEquipoA: JugadorConStats[] = [];
  jugadoresEquipoB: JugadorConStats[] = [];

  errorValidacion = '';

  ngOnChanges(changes: SimpleChanges): void {
    const cambioPartido = !!changes['partido'];
    const cambioJugadores = !!changes['jugadores'];
    const cambioIsOpen = !!changes['isOpen'];

    if (cambioIsOpen && !this.isOpen) {
      this.limpiarEstado();
      return;
    }

    if (
      (cambioPartido || cambioJugadores || cambioIsOpen) &&
      this.partido &&
      this.isOpen
    ) {
      this.cargarDatosPartido();
    }
  }

  cerrar(): void {
    if (this.loading) return;
    this.limpiarEstado();
    this.cancel.emit();
  }

  guardar(): void {
    if (!this.partido || this.loading) {
      return;
    }

    const golesA = Number(this.golesEquipoA) || 0;
    const golesB = Number(this.golesEquipoB) || 0;

    const sumaGolesA = this.sumarGoles(this.jugadoresEquipoA);
    const sumaGolesB = this.sumarGoles(this.jugadoresEquipoB);

    if (sumaGolesA !== golesA) {
      this.errorValidacion = `La suma de goles del equipo ${this.partido.equipoA} (${sumaGolesA}) no coincide con el marcador (${golesA}).`;
      return;
    }

    if (sumaGolesB !== golesB) {
      this.errorValidacion = `La suma de goles del equipo ${this.partido.equipoB} (${sumaGolesB}) no coincide con el marcador (${golesB}).`;
      return;
    }

    this.errorValidacion = '';

    const ganador = golesA > golesB ? 'A' : golesB > golesA ? 'B' : 'empate';

    const jugadoresPayload = [
      ...this.jugadoresEquipoA.map((jugador) => ({
        jugadorId: jugador.jugadorId,
        nombreJugador: jugador.nombre,
        equipo: 'A' as const,
        goles: Number(jugador.goles) || 0,
        asistencias: Number(jugador.asistencias) || 0,
        minutosJugados: this.partido?.duracionMinutos ?? 0,
      })),
      ...this.jugadoresEquipoB.map((jugador) => ({
        jugadorId: jugador.jugadorId,
        nombreJugador: jugador.nombre,
        equipo: 'B' as const,
        goles: Number(jugador.goles) || 0,
        asistencias: Number(jugador.asistencias) || 0,
        minutosJugados: this.partido?.duracionMinutos ?? 0,
      })),
    ];

    const payload: ResultadoPartidoFirestoreWrite = {
      resultadoId: this.partido.partidoId,
      partidoId: this.partido.partidoId,
      golesEquipoA: golesA,
      golesEquipoB: golesB,
      duracionRealMinutos: this.partido.duracionMinutos ?? 0,
      ganador,
      jugadores: jugadoresPayload,
      fechaRegistro: this.partido.fecha,
      fechaCreacion: this.partido.fecha as any,
      fechaActualizacion: this.partido.fecha as any,
    };

    this.confirm.emit(payload);
  }

  trackByJugadorId(index: number, jugador: JugadorConStats): string {
    return jugador.jugadorId;
  }

  private cargarDatosPartido(): void {
    this.errorValidacion = '';

    this.golesEquipoA = this.partido?.golesEquipoA ?? 0;
    this.golesEquipoB = this.partido?.golesEquipoB ?? 0;

    const jugadores = (this.jugadores ?? []).map((jugador) => ({
      ...jugador,
      goles: 0,
      asistencias: 0,
    }));

    this.jugadoresEquipoA = jugadores.filter(
      (jugador) => jugador.equipo === 'A',
    );
    this.jugadoresEquipoB = jugadores.filter(
      (jugador) => jugador.equipo === 'B',
    );
  }

  private limpiarEstado(): void {
    this.golesEquipoA = 0;
    this.golesEquipoB = 0;
    this.jugadoresEquipoA = [];
    this.jugadoresEquipoB = [];
    this.errorValidacion = '';
  }

  private sumarGoles(jugadores: JugadorConStats[]): number {
    return jugadores.reduce(
      (acc, jugador) => acc + (Number(jugador.goles) || 0),
      0,
    );
  }
}
