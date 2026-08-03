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
import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';
import { LoginService } from '../../services/login.service';
import { UsuariosService } from '../../services/usuario.service';

interface JugadorVista {
  uid: string | null;
  nombre: string;
  fotoPerfilUrl: string | null;
}

interface DetallesPartidoVm extends PartidoDetalleView {
  esOrganizador: boolean;
  nombreUsuarioActual: string | null;
  uidUsuarioActual: string | null;
  fotoUrlUsuarioActual: string | null;
  estaEnEquipoA: boolean;
  estaEnEquipoB: boolean;
  estaEnPartido: boolean;
  estaAntesDeEmpezar: boolean;
  estaFinalizado: boolean;
  jugadoresEquipoAVista: JugadorVista[];
  jugadoresEquipoBVista: JugadorVista[];
  jugadoresSinEquipoVista: JugadorVista[];
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
  private usuariosService = inject(UsuariosService);

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

  private usuariosParticipantes$: Observable<UsuarioFirestore[]> =
    this.partido$.pipe(
      switchMap((partido) => {
        if (!partido?.jugadoresId?.length) {
          return of([]);
        }

        const observables = partido.jugadoresId.map((uid) =>
          this.usuariosService.obtenerUsuarioPorUid(uid),
        );

        return combineLatest(observables).pipe(
          map((usuarios) =>
            usuarios.filter(
              (usuario): usuario is UsuarioFirestore => !!usuario,
            ),
          ),
        );
      }),
    );

  vm$: Observable<DetallesPartidoVm> = combineLatest([
    this.partido$,
    this.authUser$,
    this.currentUser$,
    this.usuariosParticipantes$,
  ]).pipe(
    map(([partido, authUser, currentUser, usuariosParticipantes]) => {
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
          fotoUrlUsuarioActual: currentUser?.fotoPerfilUrl ?? null,
          estaEnEquipoA: false,
          estaEnEquipoB: false,
          estaEnPartido: false,
          estaAntesDeEmpezar: false,
          estaFinalizado: false,
          jugadoresEquipoAVista: [],
          jugadoresEquipoBVista: [],
          jugadoresSinEquipoVista: [],
        };
      }

      const jugadoresEquipoA = partido.jugadoresEquipoA ?? [];
      const jugadoresEquipoB = partido.jugadoresEquipoB ?? [];
      const jugadoresTotales = partido.participantes ?? [];
      const jugadoresIds = partido.jugadoresId ?? [];

      const nombreUsuarioActual = currentUser?.nombre ?? null;
      const fotoUrlUsuarioActual = currentUser?.fotoPerfilUrl ?? null;

      const mapaUsuariosPorUid = new Map(
        usuariosParticipantes.map((usuario) => [usuario.uid, usuario]),
      );

      const jugadoresVistaTotales: JugadorVista[] = jugadoresTotales.map(
        (nombre, index) => {
          const uid = jugadoresIds[index] ?? null;
          const usuario = uid ? mapaUsuariosPorUid.get(uid) : null;

          return {
            uid,
            nombre,
            fotoPerfilUrl: usuario?.fotoPerfilUrl ?? null,
          };
        },
      );

      const mapaVistaPorNombre = new Map(
        jugadoresVistaTotales.map((jugador) => [jugador.nombre, jugador]),
      );

      const jugadoresEquipoAVista: JugadorVista[] = jugadoresEquipoA.map(
        (nombre) =>
          mapaVistaPorNombre.get(nombre) ?? {
            uid: null,
            nombre,
            fotoPerfilUrl: null,
          },
      );

      const jugadoresEquipoBVista: JugadorVista[] = jugadoresEquipoB.map(
        (nombre) =>
          mapaVistaPorNombre.get(nombre) ?? {
            uid: null,
            nombre,
            fotoPerfilUrl: null,
          },
      );

      const jugadoresConEquipo = new Set([
        ...jugadoresEquipoA,
        ...jugadoresEquipoB,
      ]);

      const jugadoresSinEquipo = jugadoresTotales.filter(
        (jugador) => !jugadoresConEquipo.has(jugador),
      );

      const jugadoresSinEquipoVista: JugadorVista[] = jugadoresSinEquipo.map(
        (nombre) =>
          mapaVistaPorNombre.get(nombre) ?? {
            uid: null,
            nombre,
            fotoPerfilUrl: null,
          },
      );

      const estaEnEquipoA =
        !!nombreUsuarioActual && jugadoresEquipoA.includes(nombreUsuarioActual);

      const estaEnEquipoB =
        !!nombreUsuarioActual && jugadoresEquipoB.includes(nombreUsuarioActual);

      const estaEnPartido =
        !!nombreUsuarioActual && jugadoresTotales.includes(nombreUsuarioActual);

      const esOrganizador =
        !!authUser && partido.organizadorId === authUser.uid;

      const inicio = partido.fecha?.toDate?.() ?? null;
      const ahora = new Date();
      const fin = inicio
        ? new Date(inicio.getTime() + partido.duracionMinutos * 60_000)
        : null;

      const estaAntesDeEmpezar = !!inicio && ahora < inicio;
      const estaFinalizado = !!fin && ahora >= fin;

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
        fotoUrlUsuarioActual,
        estaEnEquipoA,
        estaEnEquipoB,
        estaEnPartido,
        estaAntesDeEmpezar,
        estaFinalizado,
        jugadoresEquipoAVista,
        jugadoresEquipoBVista,
        jugadoresSinEquipoVista,
      };
    }),
  );

  async invitarJugadores(partido: Partido): Promise<void> {
    if (!this.estaAntesDeEmpezar(partido)) {
      return;
    }

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
    if (!vm.estaAntesDeEmpezar) {
      return;
    }

    if (!vm.nombreUsuarioActual || !vm.uidUsuarioActual) {
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

  private estaAntesDeEmpezar(partido: Partido): boolean {
    const inicio = partido.fecha?.toDate?.();

    if (!inicio) {
      return false;
    }

    return new Date() < inicio;
  }

  private obtenerEnlaceInvitacion(partido: Partido): string {
    if (partido.enlaceInvitacion?.trim()) {
      return partido.enlaceInvitacion;
    }

    return `${window.location.origin}/invitacion/${partido.partidoId}`;
  }

  trackByJugadorVista(index: number, jugador: JugadorVista): string {
    return jugador.uid ?? `${index}-${jugador.nombre}`;
  }
}
