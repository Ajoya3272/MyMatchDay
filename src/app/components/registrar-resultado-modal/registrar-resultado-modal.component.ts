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
  EquipoPartido,
  EstadisticaJugadorTemporal,
  JugadorPartidoSelectable,
  ResultadoPartidoFirestoreWrite,
} from '../../interfaces/Registro-resultado.interface';

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

  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<ResultadoPartidoFirestoreWrite>();

  golesEquipoA = 0;
  golesEquipoB = 0;
  duracionRealMinutos = 0;

  jugadores: JugadorPartidoSelectable[] = [];
  jugadorSeleccionadoId: string | null = null;
  statsJugadorSeleccionado: EstadisticaJugadorTemporal = {
    jugadorId: '',
    goles: 0,
    asistencias: 0,
    minutosJugados: 0,
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['partido'] && this.partido) {
      this.cargarDatosPartido();
    }

    if (changes['isOpen'] && this.isOpen && this.partido) {
      this.cargarDatosPartido();
    }
  }

  get jugadorSeleccionado(): JugadorPartidoSelectable | null {
    return (
      this.jugadores.find((j) => j.jugadorId === this.jugadorSeleccionadoId) ??
      null
    );
  }

  seleccionarJugador(jugador: JugadorPartidoSelectable): void {
    this.jugadorSeleccionadoId = jugador.jugadorId;
    this.statsJugadorSeleccionado = {
      jugadorId: jugador.jugadorId,
      goles: 0,
      asistencias: 0,
      minutosJugados:
        this.duracionRealMinutos || this.partido?.duracionMinutos || 0,
    };
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
      duracionRealMinutos: Number(this.duracionRealMinutos) || 0,
      ganador,
      jugadores: this.jugadores.map((jugador) => ({
        jugadorId: jugador.jugadorId,
        nombreJugador: jugador.nombre,
        equipo: jugador.equipo,
        goles:
          jugador.jugadorId === this.jugadorSeleccionadoId
            ? Number(this.statsJugadorSeleccionado.goles) || 0
            : 0,
        asistencias:
          jugador.jugadorId === this.jugadorSeleccionadoId
            ? Number(this.statsJugadorSeleccionado.asistencias) || 0
            : 0,
        minutosJugados:
          jugador.jugadorId === this.jugadorSeleccionadoId
            ? Number(this.statsJugadorSeleccionado.minutosJugados) || 0
            : undefined,
      })),
      fechaRegistro: this.partido.fecha,
      fechaCreacion: this.partido.fecha as any,
      fechaActualizacion: this.partido.fecha as any,
    };

    this.confirm.emit(payload);
  }

  trackByJugadorId(index: number, jugador: JugadorPartidoSelectable): string {
    return jugador.jugadorId;
  }

  private cargarDatosPartido(): void {
    this.golesEquipoA = this.partido?.golesEquipoA ?? 0;
    this.golesEquipoB = this.partido?.golesEquipoB ?? 0;
    this.duracionRealMinutos = this.partido?.duracionMinutos ?? 0;

    const equipoA = this.partido?.jugadoresEquipoA ?? [];
    const equipoB = this.partido?.jugadoresEquipoB ?? [];

    this.jugadores = [
      ...equipoA.map((nombreOrId) => ({
        jugadorId: nombreOrId,
        nombre: nombreOrId,
        equipo: 'A' as EquipoPartido,
      })),
      ...equipoB.map((nombreOrId) => ({
        jugadorId: nombreOrId,
        nombre: nombreOrId,
        equipo: 'B' as EquipoPartido,
      })),
    ];

    this.jugadorSeleccionadoId = this.jugadores[0]?.jugadorId ?? null;
    this.resetStatsSeleccionado();
  }

  private resetStatsSeleccionado(): void {
    this.statsJugadorSeleccionado = {
      jugadorId: this.jugadorSeleccionadoId ?? '',
      goles: 0,
      asistencias: 0,
      minutosJugados:
        this.duracionRealMinutos || this.partido?.duracionMinutos || 0,
    };
  }
}
