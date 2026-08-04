import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Partido } from '../../interfaces/Partido.interface';
import {
  JugadorPartidoSelectable,
  ResultadoPartidoFirestoreWrite,
} from '../../interfaces/Registro-resultado.interface';
import { PartidoService } from '../../services/partido.service';
import { RegistrarResultadoModalComponent } from '../registrar-resultado-modal/registrar-resultado-modal.component';
import { RegistrarResultadoService } from '../../services/registrar-resultado.service';
import { UsuariosService } from '../../services/usuario.service';
import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';

type UsuarioLigero = {
  uid: string;
  nombre?: string;
  fotoPerfilUrl?: string | null;
};

@Component({
  selector: 'app-registrar-resultado',
  templateUrl: './registrar-resultado.component.html',
  styleUrls: ['./registrar-resultado.component.scss'],
  standalone: true,
  imports: [
    IonSpinner,
    CommonModule,
    IonContent,
    RouterModule,
    RegistrarResultadoModalComponent,
  ],
})
export class RegistrarResultadoComponent implements OnInit {
  private auth = inject(Auth);

  finishedMatches$!: Observable<Partido[]>;

  isModalOpen = false;
  partidoSeleccionado: Partido | null = null;
  loadingSave = false;
  loadingJugadores = false;

  jugadoresDelPartido: JugadorPartidoSelectable[] = [];

  constructor(
    private partidoService: PartidoService,
    private registrarResultadoService: RegistrarResultadoService,
    private usuariosService: UsuariosService,
  ) {}

  ngOnInit(): void {
    this.finishedMatches$ = authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) {
          return of([] as Partido[]);
        }

        return this.partidoService.getPartidos().pipe(
          map((partidos) =>
            partidos
              .filter((partido) => partido.organizadorId === user.uid)
              .filter((partido) => this.debeMostrar(partido))
              .sort((a, b) => this.ordenarPartidos(a, b)),
          ),
        );
      }),
    );
  }

  getTituloPartido(partido: Partido): string {
    const nombre = (partido.nombre ?? '').trim();
    return nombre.length > 0
      ? nombre
      : `${partido.equipoA} vs ${partido.equipoB}`;
  }

  async abrirModal(partido: Partido): Promise<void> {
    this.partidoSeleccionado = partido;
    this.jugadoresDelPartido = [];
    this.loadingJugadores = true;
    this.isModalOpen = true;

    try {
      this.jugadoresDelPartido = await this.cargarJugadoresDelPartido(partido);
    } catch (error) {
      this.jugadoresDelPartido = [];
    } finally {
      this.loadingJugadores = false;
    }
  }

  cerrarModal(): void {
    this.isModalOpen = false;
    this.partidoSeleccionado = null;
    this.jugadoresDelPartido = [];
    this.loadingJugadores = false;
  }

  async guardarResultado(
    resultado: ResultadoPartidoFirestoreWrite,
  ): Promise<void> {
    if (!this.partidoSeleccionado) return;

    try {
      this.loadingSave = true;
      await this.registrarResultadoService.guardarResultado(
        this.partidoSeleccionado,
        resultado,
      );
      this.cerrarModal();
    } finally {
      this.loadingSave = false;
    }
  }

  trackByPartidoId(index: number, partido: Partido): string {
    return partido.partidoId;
  }

  private debeMostrar(partido: Partido): boolean {
    const fin = this.obtenerFechaFin(partido);
    if (!fin) return false;

    const ahora = Date.now();
    const ventana24h = 24 * 60 * 60 * 1000;
    return ahora - fin.getTime() <= ventana24h;
  }

  private ordenarPartidos(a: Partido, b: Partido): number {
    const finA = this.obtenerFechaFin(a)?.getTime() ?? 0;
    const finB = this.obtenerFechaFin(b)?.getTime() ?? 0;
    return finB - finA;
  }

  private obtenerFechaFin(partido: Partido): Date | null {
    const inicio = partido.fecha?.toDate?.();
    if (!inicio) return null;
    return new Date(inicio.getTime() + (partido.duracionMinutos ?? 0) * 60_000);
  }

  private async cargarJugadoresDelPartido(
    partido: Partido,
  ): Promise<JugadorPartidoSelectable[]> {
    const jugadoresA = partido.jugadoresEquipoA ?? [];
    const jugadoresB = partido.jugadoresEquipoB ?? [];
    const uids = [...jugadoresA, ...jugadoresB];

    if (!uids.length) return [];

    const usuarios = await Promise.all(
      uids.map(async (uid) => {
        try {
          const obs = this.usuariosService.obtenerUsuarioPorUid(uid);
          const usuario = await firstValueFrom(obs);
          return usuario as UsuarioLigero | null;
        } catch (error) {
          console.warn('[REGISTRAR-RESULTADO] fallo usuario uid:', uid, error);
          return null;
        }
      }),
    );

    const mapaUsuarios = new Map(
      usuarios.filter((u): u is UsuarioLigero => !!u).map((u) => [u.uid, u]),
    );

    return [
      ...jugadoresA.map((uid) => {
        const usuario = mapaUsuarios.get(uid);
        return {
          jugadorId: uid,
          nombre: usuario?.nombre ?? uid,
          equipo: 'A' as const,
          fotoPerfilUrl: usuario?.fotoPerfilUrl ?? null,
        };
      }),
      ...jugadoresB.map((uid) => {
        const usuario = mapaUsuarios.get(uid);
        return {
          jugadorId: uid,
          nombre: usuario?.nombre ?? uid,
          equipo: 'B' as const,
          fotoPerfilUrl: usuario?.fotoPerfilUrl ?? null,
        };
      }),
    ];
  }
}
