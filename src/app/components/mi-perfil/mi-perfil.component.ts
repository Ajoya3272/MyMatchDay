import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Platform } from '@ionic/angular';
import { IonContent } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MiPerfilService } from '../../services/mi-perfil.service';
import { UbicacionService } from '../../services/ubicacion.service';

import {
  MunicipioIne,
  ProvinciaIne,
} from '../../interfaces/ubicacion.interface';

import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';

type CampoEditable = 'nombre' | 'provincia' | 'localidad';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
  standalone: true,
  imports: [IonContent, CommonModule, FormsModule, SpinnerComponent],
})
export class MiPerfilComponent {
  private platform = inject(Platform);
  private miPerfilService = inject(MiPerfilService);
  private ubicacionService = inject(UbicacionService);

  @ViewChild('fileInput')
  fileInput?: ElementRef<HTMLInputElement>;

  usuario$ = this.miPerfilService.usuario$;

  subiendoFoto = false;
  guardandoCampo = false;

  campoEditando: CampoEditable | null = null;
  valorEditando = '';

  provincias: ProvinciaIne[] = [];
  municipios: MunicipioIne[] = [];

  cargandoProvincias = false;
  cargandoMunicipios = false;

  provinciaSeleccionadaId = '';
  municipioSeleccionadoId = '';

  async editarCampo(
    campo: CampoEditable,
    usuario: UsuarioFirestore,
  ): Promise<void> {
    if (this.guardandoCampo || this.subiendoFoto) {
      return;
    }

    await this.cargarProvinciasPerfil();

    this.campoEditando = campo;

    const provinciaUsuario = usuario.provincia ?? '';

    const provinciaEncontrada = this.provincias.find(
      (provincia) =>
        this.normalizar(provincia.nombre) === this.normalizar(provinciaUsuario),
    );

    this.provinciaSeleccionadaId = provinciaEncontrada?.provincia_id ?? '';

    if (campo === 'nombre') {
      this.valorEditando = usuario.nombre ?? '';
      return;
    }

    if (campo === 'provincia') {
      this.valorEditando = provinciaEncontrada?.nombre ?? provinciaUsuario;

      if (this.provinciaSeleccionadaId) {
        await this.cargarMunicipiosPerfil(this.provinciaSeleccionadaId);
      }

      return;
    }

    if (campo === 'localidad') {
      this.valorEditando = usuario.localidad ?? '';

      if (this.provinciaSeleccionadaId) {
        await this.cargarMunicipiosPerfil(this.provinciaSeleccionadaId);

        const municipioEncontrado = this.municipios.find(
          (municipio) =>
            this.normalizar(municipio.nombre) ===
            this.normalizar(usuario.localidad ?? ''),
        );

        this.municipioSeleccionadoId = municipioEncontrado?.municipio_id ?? '';
      }
    }
  }

  cancelarEdicion(): void {
    this.campoEditando = null;
    this.valorEditando = '';
  }

  async guardarCampo(campo: CampoEditable): Promise<void> {
    try {
      this.guardandoCampo = true;

      if (campo === 'nombre') {
        const nombre = this.valorEditando.trim();
        if (!nombre) return;

        await this.miPerfilService.actualizarDatosPerfil({
          nombre,
        });
      }

      if (campo === 'provincia') {
        const provincia = this.provincias.find(
          (p) => p.provincia_id === this.provinciaSeleccionadaId,
        );

        await this.miPerfilService.actualizarDatosPerfil({
          provincia: provincia?.nombre ?? '',
          localidad: '',
        });
      }

      if (campo === 'localidad') {
        const municipio = this.municipios.find(
          (m) => m.municipio_id === this.municipioSeleccionadoId,
        );

        await this.miPerfilService.actualizarDatosPerfil({
          localidad: municipio?.nombre ?? '',
        });
      }

      this.cancelarEdicion();
    } catch (error) {
      console.error(`Error al actualizar ${campo}:`, error);
    } finally {
      this.guardandoCampo = false;
    }
  }

  async seleccionarProvinciaPerfil(provinciaId: string): Promise<void> {
    this.provinciaSeleccionadaId = provinciaId;

    this.municipioSeleccionadoId = '';
    this.municipios = [];

    const provinciaSeleccionada = this.provincias.find(
      (provincia) => provincia.provincia_id === provinciaId,
    );

    this.valorEditando = provinciaSeleccionada?.nombre ?? '';

    if (!provinciaId) {
      return;
    }

    await this.cargarMunicipiosPerfil(provinciaId);
  }

  seleccionarLocalidadPerfil(municipioId: string): void {
    this.municipioSeleccionadoId = municipioId;

    const municipioSeleccionado = this.municipios.find(
      (municipio) => municipio.municipio_id === municipioId,
    );

    this.valorEditando = municipioSeleccionado?.nombre ?? '';
  }

  private async cargarProvinciasPerfil(): Promise<void> {
    if (this.provincias.length > 0) {
      return;
    }

    try {
      this.cargandoProvincias = true;

      this.provincias = await this.ubicacionService.obtenerProvincias();
    } catch (error) {
      console.error('Error cargando provincias:', error);
      this.provincias = [];
    } finally {
      this.cargandoProvincias = false;
    }
  }

  private async cargarMunicipiosPerfil(provinciaId: string): Promise<void> {
    if (!provinciaId) {
      this.municipios = [];
      return;
    }

    try {
      this.cargandoMunicipios = true;

      this.municipios =
        await this.ubicacionService.obtenerMunicipiosDeProvincia(provinciaId);
    } catch (error) {
      console.error('Error cargando municipios:', error);
      this.municipios = [];
    } finally {
      this.cargandoMunicipios = false;
    }
  }

  private normalizar(texto?: string | null): string {
    return (texto ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  async cambiarFotoPerfil(): Promise<void> {
    if (this.subiendoFoto || this.guardandoCampo) {
      return;
    }

    if (this.platform.is('hybrid')) {
      await this.cambiarFotoDesdeMovil();
      return;
    }

    this.fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    await this.procesarCambioDeFoto(file);

    input.value = '';
  }

  private async cambiarFotoDesdeMovil(): Promise<void> {
    try {
      const usarCamara = window.confirm(
        'Pulsa "Aceptar" para hacer una foto o "Cancelar" para elegirla de la galería.',
      );

      this.subiendoFoto = true;

      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: usarCamara ? CameraSource.Camera : CameraSource.Photos,
      });

      if (!photo.webPath) {
        return;
      }

      const response = await fetch(photo.webPath);
      const blob = await response.blob();

      const extension = blob.type?.split('/')[1] || 'jpg';

      const file = new File([blob], `avatar.${extension}`, {
        type: blob.type || 'image/jpeg',
      });

      await this.miPerfilService.cambiarFotoPerfil(file);
    } catch (error) {
      console.error('Error al cambiar la foto de perfil:', error);
    } finally {
      this.subiendoFoto = false;
    }
  }

  private async procesarCambioDeFoto(file: File): Promise<void> {
    try {
      this.subiendoFoto = true;

      await this.miPerfilService.cambiarFotoPerfil(file);
    } catch (error) {
      console.error('Error al subir foto desde web:', error);
    } finally {
      this.subiendoFoto = false;
    }
  }
}
