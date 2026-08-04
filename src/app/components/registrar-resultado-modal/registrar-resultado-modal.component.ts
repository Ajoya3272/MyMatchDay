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
  jugadoresConStats: JugadorConStats[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['partido'] || changes['jugadores'] || changes['isOpen']) &&
      this.partido
    ) {
      this.cargarDatosPartido();
    }
  }

  get jugadorSeleccionado(): JugadorConStats | null {
    return this.jugadoresConStats.length ? this.jugadoresConStats[0] : null;
  }

  cerrar(): void {
    if (this.loading) return;
    this.cancel.emit();
  }

  guardar(): void {
    if (!this.partido || this.loading) {
      return;
    }

    const ganador =
      this.golesEquipoA > this.golesEquipoB
        ? 'A'
        : this.golesEquipoB > this.golesEquipoA
          ? 'B'
          : 'empate';

    const payload: ResultadoPartidoFirestoreWrite = {
      resultadoId: this.partido.partidoId,
      partidoId: this.partido.partidoId,
      golesEquipoA: Number(this.golesEquipoA) || 0,
      golesEquipoB: Number(this.golesEquipoB) || 0,
      duracionRealMinutos: this.partido.duracionMinutos ?? 0,
      ganador,
      jugadores: this.jugadoresConStats.map((jugador) => ({
        jugadorId: jugador.jugadorId,
        nombreJugador: jugador.nombre,
        equipo: jugador.equipo,
        goles: Number(jugador.goles) || 0,
        asistencias: Number(jugador.asistencias) || 0,
        minutosJugados: this.partido?.duracionMinutos ?? 0,
      })),
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
    this.golesEquipoA = this.partido?.golesEquipoA ?? 0;
    this.golesEquipoB = this.partido?.golesEquipoB ?? 0;

    this.jugadoresConStats = (this.jugadores ?? []).map((jugador) => ({
      ...jugador,
      goles: 0,
      asistencias: 0,
    }));
  }
}
