import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Partido } from '../../interfaces/Partido.interface';
import { PartidoService } from '../../services/partido.service';
import { RegistrarResultadoModalComponent } from '../registrar-resultado-modal/registrar-resultado-modal.component';
import { ResultadoPartidoFirestoreWrite } from '../../interfaces/Registro-resultado.interface';
import { RegistrarResultadoService } from '../../services/registrar-resultado.service';

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

  constructor(
    private partidoService: PartidoService,
    private registrarResultadoService: RegistrarResultadoService,
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

  private debeMostrar(partido: Partido): boolean {
    const fin = this.obtenerFechaFin(partido);
    if (!fin) {
      return false;
    }

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

    if (!inicio) {
      return null;
    }

    return new Date(inicio.getTime() + (partido.duracionMinutos ?? 0) * 60_000);
  }

  abrirModal(partido: Partido): void {
    this.partidoSeleccionado = partido;
    this.isModalOpen = true;
  }

  cerrarModal(): void {
    this.isModalOpen = false;
    this.partidoSeleccionado = null;
  }

  async guardarResultado(
    resultado: ResultadoPartidoFirestoreWrite,
  ): Promise<void> {
    if (!this.partidoSeleccionado) {
      return;
    }

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
}
