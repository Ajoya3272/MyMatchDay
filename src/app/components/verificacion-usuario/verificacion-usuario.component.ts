import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';

    const referrer = document.referrer ?? '';
    this.verificado = referrer.includes('firebaseapp.com');
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  irAlHome() {
    this.router.navigate(['/home']);
  }
}
