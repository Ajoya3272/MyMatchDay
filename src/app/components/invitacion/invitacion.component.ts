import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';

import { InvitacionService } from '../../services/invitacion.service';
import { Partido } from '../../interfaces/Partido.interface';

type EquipoSeleccionado = 'A' | 'B';

interface ErrorConCodigo {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-invitacion',
  templateUrl: './invitacion.component.html',
  styleUrls: ['./invitacion.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent],
})
export class InvitacionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private invitacionService = inject(InvitacionService);

  slug = '';
  partidoId = '';
  matchName = 'Partido';
  organizerName = 'Organizador';
  partido: Partido | null = null;

  loading = true;
  joining = false;
  showTeamModal = false;
  selectedTeam: EquipoSeleccionado | null = null;
  joinError = '';
  partidoCompleto = false;

  async ngOnInit(): Promise<void> {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.partidoId = this.slug;

    if (!this.partidoId) {
      this.loading = false;
      return;
    }

    try {
      const partido = await this.invitacionService.obtenerPartido(
        this.partidoId,
      );

      if (!partido) {
        this.loading = false;
        return;
      }

      this.partido = partido;
      this.matchName = partido.nombre;
      this.organizerName = partido.organizador;
      this.partidoCompleto = this.esPartidoCompleto(partido);
    } catch (error: unknown) {
      console.error('[INVITACION] Error al cargar la invitación:', error);
      this.joinError = 'No se ha podido cargar la información del partido.';
    } finally {
      this.loading = false;
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  openTeamModal(): void {
    if (!this.partido || this.joining || this.loading || this.partidoCompleto) {
      return;
    }

    this.selectedTeam = null;
    this.joinError = '';
    this.showTeamModal = true;
  }

  closeTeamModal(): void {
    if (this.joining) {
      return;
    }

    this.showTeamModal = false;
    this.selectedTeam = null;
    this.joinError = '';
  }

  selectTeam(team: EquipoSeleccionado): void {
    this.selectedTeam = team;
    this.joinError = '';
  }

  async confirmJoin(): Promise<void> {
    if (!this.partido || !this.selectedTeam || this.joining || this.loading) {
      return;
    }

    this.joinError = '';
    this.joining = true;

    try {
      await this.invitacionService.unirseAPartido({
        partidoId: this.partido.partidoId,
        equipoSeleccionado: this.selectedTeam,
      });

      this.showTeamModal = false;

      await this.router.navigate(['/detalles-partido'], {
        queryParams: { partidoId: this.partido.partidoId },
      });
    } catch (error: unknown) {
      console.error('[INVITACION] Error al unirse al partido:', error);

      if (this.esErrorDePartidoCompleto(error)) {
        this.partidoCompleto = true;
        this.showTeamModal = false;
        this.selectedTeam = null;
        this.joinError =
          'No puedes unirte porque los equipos ya están completos.';
        return;
      }

      this.joinError = this.obtenerMensajeDeError(error);
    } finally {
      this.joining = false;
    }
  }

  private esPartidoCompleto(partido: Partido): boolean {
    const max = Number((partido as { playerCount?: unknown }).playerCount ?? 0);
    const actual = Number(
      (partido as { jugadores?: unknown[] }).jugadores?.length ??
        (partido as { participantes?: unknown[] }).participantes?.length ??
        0,
    );

    return max > 0 && actual >= max;
  }

  private esErrorDePartidoCompleto(error: unknown): boolean {
    const code = this.obtenerCodigoDeError(error);
    const message = this.obtenerTextoDeError(error).toLowerCase();

    return (
      code === 'MAX_PLAYERS_REACHED' ||
      code === 'PARTIDO_COMPLETO' ||
      code === 'resource-exhausted' ||
      message.includes('ya está completo') ||
      message.includes('ya esta completo') ||
      message.includes('partido lleno') ||
      message.includes('máximo de jugadores') ||
      message.includes('maximo de jugadores')
    );
  }

  private obtenerMensajeDeError(error: unknown): string {
    const errorCode = this.obtenerCodigoDeError(error);
    const errorMessage = this.obtenerTextoDeError(error);
    const textoError = errorMessage.toLowerCase();

    if (
      errorCode === 'MAX_PLAYERS_REACHED' ||
      errorCode === 'PARTIDO_COMPLETO' ||
      errorCode === 'resource-exhausted' ||
      textoError.includes('partido lleno') ||
      textoError.includes('partido está lleno') ||
      textoError.includes('partido esta lleno') ||
      textoError.includes('número máximo') ||
      textoError.includes('numero maximo') ||
      textoError.includes('capacidad máxima') ||
      textoError.includes('capacidad maxima') ||
      textoError.includes('máximo de jugadores') ||
      textoError.includes('maximo de jugadores')
    ) {
      return 'No puedes unirte a este partido porque ya se ha alcanzado el número máximo de jugadores.';
    }

    if (
      errorCode === 'already-exists' ||
      errorCode === 'ALREADY_JOINED' ||
      textoError.includes('ya estás unido') ||
      textoError.includes('ya estas unido') ||
      textoError.includes('ya pertenece')
    ) {
      return 'Ya estás apuntado a este partido.';
    }

    if (errorCode === 'not-found' || errorCode === 'PARTIDO_NO_ENCONTRADO') {
      return 'El partido ya no existe o no está disponible.';
    }

    if (errorMessage.trim()) {
      return errorMessage;
    }

    return 'No se ha podido completar la inscripción. Inténtalo de nuevo.';
  }

  private obtenerCodigoDeError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const errorConCodigo = error as ErrorConCodigo;
      return String(errorConCodigo.code ?? '');
    }

    return '';
  }

  private obtenerTextoDeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorConMensaje = error as ErrorConCodigo;
      return String(errorConMensaje.message ?? '');
    }

    return '';
  }
}
