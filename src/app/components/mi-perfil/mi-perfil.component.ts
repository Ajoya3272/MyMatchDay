import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { SpinnerComponent } from '../../components/spinner/spinner.component';
import { MiPerfilService } from '../../services/mi-perfil.service';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
  imports: [IonContent, CommonModule, SpinnerComponent],
  standalone: true,
})
export class MiPerfilComponent {
  private platform = inject(Platform);
  private miPerfilService = inject(MiPerfilService);

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  usuario$ = this.miPerfilService.usuario$;
  subiendoFoto = false;

  async cambiarFotoPerfil(): Promise<void> {
    if (this.subiendoFoto) {
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
