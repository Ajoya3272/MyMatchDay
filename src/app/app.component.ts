import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { App } from '@capacitor/app';
import {
  IonApp,
  IonMenu,
  IonRouterOutlet,
  MenuController,
  Platform,
} from '@ionic/angular/standalone';
import { HeaderComponent } from './shared/header/header.component';
import { MenuLateralComponent } from './shared/menu-lateral/menu-lateral.component';
import { NotificacionesService } from './services/notificaciones.service';
import { AvisosOrganizadorService } from './services/aviso-organizador.service';
import { LoginService } from './services/login.service';

type ThemeMode = 'light' | 'dark';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [
    IonApp,
    IonMenu,
    IonRouterOutlet,
    HeaderComponent,
    MenuLateralComponent,
  ],
})
export class AppComponent {
  private router = inject(Router);
  private menuCtrl = inject(MenuController);
  private location = inject(Location);
  private platform = inject(Platform);
  private notificacionesService = inject(NotificacionesService);
  private avisosOrganizadorService = inject(AvisosOrganizadorService);
  private loginService = inject(LoginService);

  hideLayout = false;

  private previousUrl: string | null = null;

  private readonly themeStorageKey = 'theme';

  constructor() {
    this.initializeTheme();
    this.updateLayout(this.router.url);

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.previousUrl = this.router.url;
        this.updateLayout(event.urlAfterRedirects);
      });

    void this.inicializarNotificaciones();
    this.inicializarBotonAtras();
    this.avisosOrganizadorService.escuchar();
  }

  private inicializarBotonAtras(): void {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      const menuAbierto = await this.menuCtrl.isOpen('main-menu');

      if (menuAbierto) {
        await this.menuCtrl.close('main-menu');
        return;
      }

      const urlActual = this.router.url.split('?')[0];

      const esPantallaPrincipal =
        urlActual === '/home' ||
        urlActual === '/login' ||
        urlActual === '/registro-usuario' ||
        urlActual === '/verificacion-usuario';

      // Si Angular conoce una pantalla anterior, vuelve atrás.
      if (this.previousUrl && this.previousUrl !== this.router.url) {
        this.location.back();
        return;
      }

      // Si estamos en Home u otra pantalla principal, cerrar la app.
      if (esPantallaPrincipal) {
        await App.exitApp();
        return;
      }

      // Si no hay historial conocido, volver a Home.
      void this.router.navigate(['/home']);
    });
  }

  private async inicializarNotificaciones(): Promise<void> {
    try {
      const permisoConcedido =
        await this.notificacionesService.inicializarPermisos();

      if (!permisoConcedido) {
        console.warn(
          '[NOTIFICACIONES] El usuario no ha concedido permiso para notificaciones.',
        );
      }
    } catch (error) {
      console.error('[NOTIFICACIONES] Error inicializando permisos:', error);
    }

    try {
      await this.loginService.inicializarPushSiHaySesion();
    } catch (error) {
      console.error('[NOTIFICACIONES] Error inicializando push:', error);
    }
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(
      this.themeStorageKey,
    ) as ThemeMode | null;

    if (savedTheme === 'dark' || savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', savedTheme);
      return;
    }

    const systemTheme: ThemeMode = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches
      ? 'dark'
      : 'light';

    document.documentElement.setAttribute('data-theme', systemTheme);
    localStorage.setItem(this.themeStorageKey, systemTheme);
  }

  private updateLayout(url: string): void {
    this.hideLayout =
      url.startsWith('/login') ||
      url.startsWith('/registro-usuario') ||
      url.startsWith('/verificacion-usuario');

    void this.menuCtrl.enable(!this.hideLayout, 'main-menu');

    if (this.hideLayout) {
      void this.menuCtrl.close('main-menu');
    }
  }
}
