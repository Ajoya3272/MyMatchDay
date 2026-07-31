import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { IonApp, IonMenu, IonRouterOutlet } from '@ionic/angular/standalone';

import { HeaderComponent } from './shared/header/header.component';
import { MenuLateralComponent } from './shared/menu-lateral/menu-lateral.component';

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

  constructor(private router: Router) {
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

  private updateLayout(url: string): void {
    this.hideLayout =
      url.startsWith('/login') || url.startsWith('/registro-usuario');
  }
}
