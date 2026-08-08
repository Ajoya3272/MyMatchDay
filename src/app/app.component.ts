import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

import { IonApp, IonMenu, IonRouterOutlet } from '@ionic/angular/standalone';

import { HeaderComponent } from './shared/header/header.component';
import { MenuLateralComponent } from './shared/menu-lateral/menu-lateral.component';

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
  hideLayout = false;

  private readonly themeStorageKey = 'theme';

  constructor(private router: Router) {
    this.initializeTheme();

    this.updateLayout(this.router.url);

    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd => event instanceof NavigationEnd,
        ),
      )
      .subscribe((event) => {
        this.updateLayout(event.urlAfterRedirects);
      });
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
  }
}
