import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';

import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';
import { UsuariosService } from '../../services/usuario.service';

interface ResultadoBusqueda extends UsuarioFirestore {
  esAmigo: boolean;
  agregando: boolean;
}

@Component({
  selector: 'app-buscar-amigos',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  templateUrl: './buscar-amigos.component.html',
  styleUrls: ['./buscar-amigos.component.scss'],
})
export class BuscarAmigosComponent {
  private usuariosService = inject(UsuariosService);
  private router = inject(Router);

  busqueda = '';
  buscando = false;
  yaBusco = false;
  resultados: ResultadoBusqueda[] = [];
  error = '';

  async buscar(): Promise<void> {
    const texto = this.busqueda.trim();

    if (!texto) {
      this.resultados = [];
      this.yaBusco = false;
      this.error = '';
      return;
    }

    this.buscando = true;
    this.yaBusco = true;
    this.error = '';

    try {
      const usuarios = await this.usuariosService.buscarUsuarios(texto);

      this.resultados = await Promise.all(
        usuarios.map(async (usuario) => ({
          ...usuario,
          esAmigo: await firstValueFrom(
            this.usuariosService.esAmigo(usuario.uid),
          ),
          agregando: false,
        })),
      );
    } catch (error) {
      console.error('[BUSCAR-AMIGOS] Error buscando usuarios:', error);

      this.error = 'No se pudo completar la búsqueda.';
      this.resultados = [];
    } finally {
      this.buscando = false;
    }
  }

  async agregarAmigo(resultado: ResultadoBusqueda): Promise<void> {
    if (resultado.esAmigo || resultado.agregando) {
      return;
    }

    resultado.agregando = true;
    this.error = '';

    try {
      await this.usuariosService.agregarAmigo(resultado);
      resultado.esAmigo = true;
    } catch (error) {
      console.error('[BUSCAR-AMIGOS] Error siguiendo al usuario:', error);

      this.error = 'No se pudo seguir a este usuario.';
    } finally {
      resultado.agregando = false;
    }
  }

  abrirEstadisticas(resultado: ResultadoBusqueda): void {
    if (!resultado.esAmigo || !resultado.uid) {
      return;
    }

    void this.router.navigate(['/estadisticas'], {
      queryParams: {
        jugadorId: resultado.uid,
        nombre: resultado.nombre,
      },
    });
  }
}
