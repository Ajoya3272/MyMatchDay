import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { InvitacionService } from '../../services/invitacion.service';
import { Partido } from '../../interfaces/Partido.interface';

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

  joining = false;
  showTeamModal = false;
  selectedTeam: 'A' | 'B' | null = null;
  loading = true;

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
    } catch (error) {
      console.error('Error al cargar la invitación:', error);
    } finally {
      this.loading = false;
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  openTeamModal(): void {
    if (!this.partido || this.joining || this.loading) {
      return;
    }

    this.selectedTeam = null;
    this.showTeamModal = true;
  }

  closeTeamModal(): void {
    if (this.joining) {
      return;
    }

    this.showTeamModal = false;
    this.selectedTeam = null;
  }

  selectTeam(team: 'A' | 'B'): void {
    this.selectedTeam = team;
  }

  async confirmJoin(): Promise<void> {
    if (!this.partido || !this.selectedTeam || this.joining || this.loading) {
      return;
    }

    try {
      this.joining = true;

      await this.invitacionService.unirseAPartido({
        partidoId: this.partido.partidoId,
        equipoSeleccionado: this.selectedTeam,
      });

      this.showTeamModal = false;

      await this.router.navigate(['/detalles-partido'], {
        queryParams: { partidoId: this.partido.partidoId },
      });
    } catch (error) {
      console.error('Error al unirse al partido:', error);
    } finally {
      this.joining = false;
    }
  }
}
