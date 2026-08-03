import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  doc,
  docData,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  Partido,
  PartidoDetalleView,
} from '../../interfaces/Partido.interface';
import { LoginService } from '../../services/login.service';

interface DetallesPartidoVm extends PartidoDetalleView {
  esOrganizador: boolean;
  nombreUsuarioActual: string | null;
  uidUsuarioActual: string | null;
  estaEnEquipoA: boolean;
  estaEnEquipoB: boolean;
  estaEnPartido: boolean;
}

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
  private auth = inject(Auth);
  private loginService = inject(LoginService);

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

  authUser$ = authState(this.auth);
  currentUser$ = this.loginService.user$;

  vm$: Observable<DetallesPartidoVm> = combineLatest([
    this.partido$,
    this.authUser$,
    this.currentUser$,
  ]).pipe(
    map(([partido, authUser, currentUser]) => {
      if (!partido) {
        return {
          partido: null,
          jugadoresTotales: [],
          jugadoresEquipoA: [],
          jugadoresEquipoB: [],
          jugadoresSinEquipo: [],
          plazasLibres: 0,
          esOrganizador: false,
          nombreUsuarioActual: null,
          uidUsuarioActual: authUser?.uid ?? null,
          estaEnEquipoA: false,
          estaEnEquipoB: false,
          estaEnPartido: false,
        };
      }

      const jugadoresEquipoA = partido.jugadoresEquipoA ?? [];
      const jugadoresEquipoB = partido.jugadoresEquipoB ?? [];
      const jugadoresTotales = partido.participantes ?? [];
      const nombreUsuarioActual = currentUser?.nombre ?? null;

      const jugadoresConEquipo = new Set([
        ...jugadoresEquipoA,
        ...jugadoresEquipoB,
      ]);

      const jugadoresSinEquipo = jugadoresTotales.filter(
        (jugador) => !jugadoresConEquipo.has(jugador),
      );

      const estaEnEquipoA =
        !!nombreUsuarioActual && jugadoresEquipoA.includes(nombreUsuarioActual);

      const estaEnEquipoB =
        !!nombreUsuarioActual && jugadoresEquipoB.includes(nombreUsuarioActual);

      const estaEnPartido =
        !!nombreUsuarioActual && jugadoresTotales.includes(nombreUsuarioActual);

      const esOrganizador =
        !!authUser && partido.organizadorId === authUser.uid;

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
        esOrganizador,
        nombreUsuarioActual,
        uidUsuarioActual: authUser?.uid ?? null,
        estaEnEquipoA,
        estaEnEquipoB,
        estaEnPartido,
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

  async unirseAEquipo(
    partido: Partido,
    equipo: 'A' | 'B',
    vm: DetallesPartidoVm,
  ): Promise<void> {
    if (!vm.esOrganizador || !vm.nombreUsuarioActual || !vm.uidUsuarioActual) {
      return;
    }

    const partidoRef = doc(this.firestore, `partidos/${partido.partidoId}`);
    const nombre = vm.nombreUsuarioActual;

    try {
      if (equipo === 'A') {
        await updateDoc(partidoRef, {
          jugadoresId: arrayUnion(vm.uidUsuarioActual),
          participantes: arrayUnion(nombre),
          jugadoresEquipoA: arrayUnion(nombre),
          jugadoresEquipoB: arrayRemove(nombre),
          fechaActualizacion: serverTimestamp(),
        });

        return;
      }

      await updateDoc(partidoRef, {
        jugadoresId: arrayUnion(vm.uidUsuarioActual),
        participantes: arrayUnion(nombre),
        jugadoresEquipoB: arrayUnion(nombre),
        jugadoresEquipoA: arrayRemove(nombre),
        fechaActualizacion: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error al unirse al equipo:', error);
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
