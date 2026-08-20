import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  docData,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
  DetallesPartidoVm,
  JugadorVista,
  Partido,
  PartidoDetalleView,
} from '../../interfaces/Partido.interface';
import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';
import { LoginService } from '../../services/login.service';
import { UsuariosService } from '../../services/usuario.service';
import { environment } from '../../../enviroments/enviroment';

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
      const uidUsuarioActual = authUser?.uid ?? null;
      const fotoUrlUsuarioActual = currentUser?.fotoPerfilUrl ?? null;

      const mapaUsuariosPorUid = new Map(
        usuariosParticipantes.map((usuario) => [usuario.uid, usuario]),
      );

      const jugadoresVistaTotales: JugadorVista[] = jugadoresIds.map((uid) => {
        const usuario = mapaUsuariosPorUid.get(uid);

        return {
          uid,
          nombre: usuario?.nombre ?? uid,
          fotoPerfilUrl: usuario?.fotoPerfilUrl ?? null,
        };
      });

      const mapaVistaPorUid = new Map(
        jugadoresVistaTotales.map((jugador) => [jugador.uid, jugador]),
      );

      const jugadoresEquipoAVista: JugadorVista[] = jugadoresEquipoA.map(
        (uid) =>
          mapaVistaPorUid.get(uid) ?? {
            uid,
            nombre: uid,
            fotoPerfilUrl: null,
          },
      );

      const jugadoresEquipoBVista: JugadorVista[] = jugadoresEquipoB.map(
        (uid) =>
          mapaVistaPorUid.get(uid) ?? {
            uid,
            nombre: uid,
            fotoPerfilUrl: null,
          },
      );

      const jugadoresConEquipo = new Set([
        ...jugadoresEquipoA,
        ...jugadoresEquipoB,
      ]);

      const jugadoresSinEquipo = jugadoresIds.filter(
        (uid) => !jugadoresConEquipo.has(uid),
      );

      const jugadoresSinEquipoVista: JugadorVista[] = jugadoresSinEquipo.map(
        (uid) =>
          mapaVistaPorUid.get(uid) ?? {
            uid,
            nombre: uid,
            fotoPerfilUrl: null,
          },
      );

      const estaEnEquipoA =
        !!uidUsuarioActual && jugadoresEquipoA.includes(uidUsuarioActual);
      const estaEnEquipoB =
        !!uidUsuarioActual && jugadoresEquipoB.includes(uidUsuarioActual);
      const estaEnPartido =
        !!uidUsuarioActual && jugadoresIds.includes(uidUsuarioActual);

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
          partido.numeroJugadores - jugadoresIds.length,
          0,
        ),
        esOrganizador,
        nombreUsuarioActual,
        uidUsuarioActual,
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
      text: `Únete a mi partido "${partido.nombre}" en JoinMatch`,
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
    const uid = vm.uidUsuarioActual;
    const nombre = vm.nombreUsuarioActual;

    try {
      if (equipo === 'A') {
        await updateDoc(partidoRef, {
          jugadoresId: arrayUnion(uid),
          participantes: arrayUnion(nombre),
          jugadoresEquipoA: arrayUnion(uid),
          jugadoresEquipoB: arrayRemove(uid),
          fechaActualizacion: serverTimestamp(),
        });
        return;
      }

      await updateDoc(partidoRef, {
        jugadoresId: arrayUnion(uid),
        participantes: arrayUnion(nombre),
        jugadoresEquipoB: arrayUnion(uid),
        jugadoresEquipoA: arrayRemove(uid),
        fechaActualizacion: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error al unirse al equipo:', error);
    }
  }

  async abandonarEquipo(
    partido: Partido,
    vm: DetallesPartidoVm,
  ): Promise<void> {
    if (!vm.estaAntesDeEmpezar || !vm.estaEnPartido) {
      return;
    }

    if (!vm.nombreUsuarioActual || !vm.uidUsuarioActual) {
      return;
    }

    const partidoRef = doc(this.firestore, `partidos/${partido.partidoId}`);
    const uid = vm.uidUsuarioActual;
    const nombre = vm.nombreUsuarioActual;

    try {
      await updateDoc(partidoRef, {
        jugadoresId: arrayRemove(uid),
        participantes: arrayRemove(nombre),
        jugadoresEquipoA: arrayRemove(uid),
        jugadoresEquipoB: arrayRemove(uid),
        fechaActualizacion: serverTimestamp(),
      });

      await this.crearAvisoAbandono(partido, nombre);
    } catch (error) {
      console.error('Error al abandonar el equipo:', error);
    }
  }

  private async crearAvisoAbandono(
    partido: Partido,
    nombreJugador: string,
  ): Promise<void> {
    const avisosRef = collection(
      this.firestore,
      `partidos/${partido.partidoId}/avisos`,
    );
    const avisoRef = doc(avisosRef);

    await setDoc(avisoRef, {
      tipo: 'abandono',
      partidoId: partido.partidoId,
      partidoNombre: partido.nombre,
      organizadorId: partido.organizadorId,
      jugadorNombre: nombreJugador,
      leido: false,
      fechaCreacion: serverTimestamp(),
    });
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

  trackByJugadorVista(index: number, jugador: JugadorVista): string {
    return jugador.uid ?? `${index}-${jugador.nombre}`;
  }
}
