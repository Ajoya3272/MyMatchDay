import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth, applyActionCode } from '@angular/fire/auth';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  footballOutline,
  homeOutline,
  mailOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-verificacion-usuario',
  standalone: true,
  templateUrl: './verificacion-usuario.component.html',
  styleUrls: ['./verificacion-usuario.component.scss'],
  imports: [
    CommonModule,
    RouterLink,
    IonButton,
    IonContent,
    IonIcon,
    IonNote,
    IonSpinner,
  ],
})
export class VerificacionUsuarioComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);

  loading = false;
  verificado = false;
  errorMessage = '';
  email = '';

  constructor() {
    addIcons({
      footballOutline,
      mailOutline,
      checkmarkCircleOutline,
      homeOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    const mode = this.route.snapshot.queryParamMap.get('mode');
    const oobCode = this.route.snapshot.queryParamMap.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
      await this.verificarCorreo(oobCode);
    }
  }

  private async verificarCorreo(oobCode: string): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';

      await applyActionCode(this.auth, oobCode);

      this.verificado = true;

      setTimeout(() => {
        this.router.navigate(['/login'], {
          queryParams: { verified: '1' },
        });
      }, 1500);
    } catch (error) {
      console.error('Error verificando correo', error);
      this.errorMessage =
        'El enlace de verificación no es válido, ha expirado o ya fue utilizado.';
    } finally {
      this.loading = false;
    }
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}
