import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonMenu, IonRouterOutlet } from '@ionic/angular/standalone';
import { HeaderComponent } from './shared/header/header.component';
import { MenuLateralComponent } from './shared/menu-lateral/menu-lateral.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    IonApp,
    CommonModule,
    HeaderComponent,
    MenuLateralComponent,
    IonMenu,
    IonRouterOutlet,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'football-app';
}
