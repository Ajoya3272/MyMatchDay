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
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { Observable, switchMap, of, firstValueFrom } from 'rxjs';
import { IonContent } from '@ionic/angular/standalone';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Platform } from '@ionic/angular';
import { UsuarioFirestore } from '../../interfaces/RegistroUsuario.interface';

@Component({
  selector: 'app-mi-perfil',
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
  imports: [IonContent, CommonModule],
  standalone: true,
})
export class MiPerfilComponent implements OnInit {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private platform = inject(Platform);

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
      await this.subirArchivoPerfil(file);
    } catch (error) {
      console.error('Error al subir foto desde web:', error);
    } finally {
      this.subiendoFoto = false;
      input.value = '';
    }
  }

  private async cambiarFotoDesdeMovil(): Promise<void> {
    try {
      const currentUser = await firstValueFrom(authState(this.auth));

      if (!currentUser) {
        return;
      }

      this.subiendoFoto = true;

      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: true,
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
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

      await this.subirArchivoPerfil(file);
    } catch (error) {
      console.error('Error al cambiar la foto de perfil:', error);
    } finally {
      this.subiendoFoto = false;
    }
  }

  private async subirArchivoPerfil(file: File): Promise<void> {
    const currentUser = await firstValueFrom(authState(this.auth));

    if (!currentUser) {
      return;
    }

    const extension = file.type?.split('/')[1] || 'jpg';
    const storagePath = `usuarios/${currentUser.uid}/perfil/avatar.${extension}`;
    const storageRef = ref(this.storage, storagePath);

    await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg',
    });

    const downloadURL = await getDownloadURL(storageRef);
    const userDocRef = doc(this.firestore, `usuarios/${currentUser.uid}`);

    await updateDoc(userDocRef, {
      fotoPerfilUrl: downloadURL,
      fechaActualizacion: serverTimestamp(),
    });
  }
}
