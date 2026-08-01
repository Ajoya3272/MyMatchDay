import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  updateDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, switchMap, of, firstValueFrom } from 'rxjs';
import { IonContent } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';
import { cloudinary } from '../../../enviroments/enviroment';
import { SpinnerComponent } from '../../components/spinner/spinner.component';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
  imports: [IonContent, CommonModule, SpinnerComponent],
  standalone: true,
})
export class MiPerfilComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private platform = inject(Platform);

  private readonly cloudName = cloudinary.cloudName;
  private readonly uploadPreset = cloudinary.uploadPreset;

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  usuario$: Observable<UsuarioFirestore | null> = of(null);
  uid: string | null = null;
  subiendoFoto = false;

  ngOnInit(): void {
    this.usuario$ = authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) {
          this.uid = null;
          return of(null);
        }

        this.uid = user.uid;
        const userDocRef = doc(this.firestore, `usuarios/${user.uid}`);
        return docData(userDocRef) as Observable<UsuarioFirestore>;
      }),
    );
  }

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

    try {
      this.subiendoFoto = true;
      const imageUrl = await this.subirACloudinary(file);
      await this.guardarFotoPerfil(imageUrl);
    } catch (error) {
      console.error('Error al subir foto desde web:', error);
    } finally {
      this.subiendoFoto = false;
      input.value = '';
    }
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

      const imageUrl = await this.subirACloudinary(file);
      await this.guardarFotoPerfil(imageUrl);
    } catch (error) {
      console.error('Error al cambiar la foto de perfil:', error);
    } finally {
      this.subiendoFoto = false;
    }
  }

  private async subirACloudinary(file: File): Promise<string> {
    const url = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.secure_url) {
      console.error('Respuesta de Cloudinary:', data);
      throw new Error('No se pudo subir la imagen a Cloudinary');
    }

    return data.secure_url;
  }

  private async guardarFotoPerfil(fotoPerfilUrl: string): Promise<void> {
    const currentUser = await firstValueFrom(authState(this.auth));

    if (!currentUser) {
      return;
    }

    const userDocRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    await updateDoc(userDocRef, {
      fotoPerfilUrl,
      fechaActualizacion: serverTimestamp(),
    });
  }
}
