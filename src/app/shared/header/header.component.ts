import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, personOutline, settingsOutline } from 'ionicons/icons';
import { LoginService } from '../../services/login.service';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon],
  animations: [
    trigger('profileMenuAnimation', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translateY(-8px) scale(0.98)',
        }),
        animate(
          '180ms ease-out',
          style({
            opacity: 1,
            transform: 'translateY(0) scale(1)',
          }),
        ),
      ]),
      transition(':leave', [
        animate(
          '140ms ease-in',
          style({
            opacity: 0,
            transform: 'translateY(-6px) scale(0.98)',
          }),
        ),
      ]),
    ]),
  ],
})
export class HeaderComponent {
  private menuCtrl = inject(MenuController);
  private router = inject(Router);
  private loginService = inject(LoginService);

  isProfileOpen = false;

  user$ = this.loginService.user$;
  inicialUsuario$ = this.loginService.inicialUsuario$;

  constructor() {
    addIcons({
      personOutline,
      settingsOutline,
      logOutOutline,
    });
  }

  async openMainMenu(): Promise<void> {
    this.closeProfileMenu();
    await this.menuCtrl.enable(true, 'main-menu');
    await this.menuCtrl.open('main-menu');
  }

  goHome(): void {
    this.closeProfileMenu();
    this.router.navigate(['/home']);
  }

  toggleProfileMenu(): void {
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeProfileMenu(): void {
    this.isProfileOpen = false;
  }

  goPerfil(): void {
    this.closeProfileMenu();
    this.router.navigate(['/mi-perfil']);
  }

  goAjustes(): void {
    this.closeProfileMenu();
    this.router.navigate(['/ajustes']);
  }

  async cerrarSesion(): Promise<void> {
    this.closeProfileMenu();
    await this.loginService.cerrarSesion();
    await this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    if (this.isProfileOpen) {
      this.closeProfileMenu();
    }
  }

  onProfileAreaClick(event: Event): void {
    event.stopPropagation();
  }
}
