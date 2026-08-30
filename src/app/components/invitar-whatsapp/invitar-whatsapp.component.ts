import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Partido } from '../../interfaces/Partido.interface';
import { PartidoService } from '../../services/partido.service';
import { environment } from '../../../enviroments/enviroment';

@Component({
  selector: 'app-invitar-whatsapp',
  templateUrl: './invitar-whatsapp.component.html',
  styleUrls: ['./invitar-whatsapp.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterLink, IonContent, IonSpinner],
})
export class InvitarWhatsappComponent {
  private auth = inject(Auth);
  private partidoService = inject(PartidoService);

  partidosPendientes$: Observable<Partido[]> = authState(this.auth).pipe(
    switchMap((user) => {
      if (!user) {
        return of([] as Partido[]);
      }

      return this.partidoService.obtenerPartidosOrganizados(user.uid);
    }),
    map((partidos) => partidos.filter((partido) => this.esPendiente(partido))),
  );

  getTituloPartido(partido: Partido): string {
    const nombre = (partido.nombre ?? '').trim();
    return nombre.length > 0
      ? nombre
      : `${partido.equipoA} vs ${partido.equipoB}`;
  }

  async invitar(partido: Partido): Promise<void> {
    const enlace = this.obtenerEnlaceInvitacion(partido);
    const titulo = this.getTituloPartido(partido);

    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: titulo,
          text: `Únete a mi partido "${titulo}" en JoinMatch`,
          url: enlace,
          dialogTitle: 'Invitar al partido',
        });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: titulo,
          text: `Únete a mi partido "${titulo}" en JoinMatch`,
          url: enlace,
        });
        return;
      }

      await navigator.clipboard.writeText(enlace);
      alert('Enlace de invitación copiado al portapapeles');
    } catch (error) {
      const esCancelacionUsuario =
        error instanceof Error && error.message === 'Share canceled';

      if (esCancelacionUsuario) {
        return;
      }

      console.error('Error al compartir la invitación:', error);
    }
  }

  trackByPartidoId(index: number, partido: Partido): string {
    return partido.partidoId;
  }

  private esPendiente(partido: Partido): boolean {
    const inicio = partido.fecha?.toDate?.();

    if (!inicio) {
      return false;
    }

    return new Date() < inicio;
  }

  private obtenerEnlaceInvitacion(partido: Partido): string {
    if (partido.enlaceInvitacion?.trim()) {
      return partido.enlaceInvitacion.trim();
    }

    return `${this.getAppUrl()}/invitacion/${partido.partidoId}`;
  }

  private getAppUrl(): string {
    const configuredUrl = environment.appUrl?.trim();

    if (configuredUrl) {
      return configuredUrl.replace(/\/+$/, '');
    }

    return window.location.origin.replace(/\/+$/, '');
  }
}
