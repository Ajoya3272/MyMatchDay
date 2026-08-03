import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  Partido,
  PartidoDetalleView,
} from '../../interfaces/Partido.interface';

@Component({
  selector: 'app-detalles-partido',
  templateUrl: './detalles-partido.component.html',
  styleUrls: ['./detalles-partido.component.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, RouterLink],
})
export class DetallesPartidoComponent {
  private route = inject(ActivatedRoute);
  private firestore = inject(Firestore);

  partidoId$: Observable<string | null> = this.route.queryParamMap.pipe(
    map((params) => params.get('partidoId')),
  );

  partido$: Observable<Partido | null> = this.partidoId$.pipe(
    switchMap((partidoId) => {
      if (!partidoId) {
        return of(null);
      }

      const partidoRef = doc(this.firestore, `partidos/${partidoId}`);
      return docData(partidoRef) as Observable<Partido | null>;
    }),
  );

  vm$: Observable<PartidoDetalleView> = this.partido$.pipe(
    map((partido) => {
      if (!partido) {
        return {
          partido: null,
          jugadoresTotales: [],
          jugadoresEquipoA: [],
          jugadoresEquipoB: [],
          jugadoresSinEquipo: [],
          plazasLibres: 0,
        };
      }

      const jugadoresEquipoA = partido.jugadoresEquipoA ?? [];
      const jugadoresEquipoB = partido.jugadoresEquipoB ?? [];
      const jugadoresTotales = partido.participantes ?? [];

      const jugadoresConEquipo = new Set([
        ...jugadoresEquipoA,
        ...jugadoresEquipoB,
      ]);

      const jugadoresSinEquipo = jugadoresTotales.filter(
        (jugador) => !jugadoresConEquipo.has(jugador),
      );

      return {
        partido,
        jugadoresTotales,
        jugadoresEquipoA,
        jugadoresEquipoB,
        jugadoresSinEquipo,
        plazasLibres: Math.max(
          partido.numeroJugadores - jugadoresTotales.length,
          0,
        ),
      };
    }),
  );

  async invitarJugadores(partido: Partido): Promise<void> {
    const enlace = this.obtenerEnlaceInvitacion(partido);

    const shareData = {
      title: partido.nombre,
      text: `Únete a mi partido "${partido.nombre}" en MYMATCHDAY`,
      url: enlace,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(enlace);
      alert('Enlace de invitación copiado al portapapeles');
    } catch (error) {
      console.error('Error al compartir la invitación:', error);
    }
  }

  private obtenerEnlaceInvitacion(partido: Partido): string {
    if (partido.enlaceInvitacion?.trim()) {
      return partido.enlaceInvitacion;
    }

    return `${window.location.origin}/invitacion/${partido.partidoId}`;
  }

  trackByNombre(index: number, nombre: string): string {
    return `${index}-${nombre}`;
  }
}
