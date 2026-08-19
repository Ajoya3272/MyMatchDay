import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { Subject, takeUntil } from 'rxjs';

import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';
import { UsuariosService } from '../../services/usuario.service';

@Component({
  selector: 'app-mis-seguidos',
  standalone: true,
  imports: [CommonModule, IonContent],
  templateUrl: './mis-seguidos.component.html',
  styleUrls: ['./mis-seguidos.component.scss'],
})
export class MisSeguidosComponent implements OnInit, OnDestroy {
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  seguidos: UsuarioFirestore[] = [];
  cargando = true;
  error = '';

  ngOnInit(): void {
    this.usuariosService
      .obtenerSeguidos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (seguidos) => {
          this.seguidos = seguidos;
          this.cargando = false;
        },
        error: (error) => {
          console.error(
            '[MIS-SEGUIDOS] Error cargando jugadores seguidos:',
            error,
          );

          this.error = 'No se pudieron cargar los jugadores seguidos.';
          this.cargando = false;
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verEstadisticas(jugador: UsuarioFirestore): void {
    if (!jugador.uid) {
      return;
    }

    void this.router.navigate(['/estadisticas'], {
      queryParams: {
        jugadorId: jugador.uid,
        nombre: jugador.nombre,
      },
    });
  }
}
