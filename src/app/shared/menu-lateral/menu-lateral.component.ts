import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonMenuToggle,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { footballOutline } from 'ionicons/icons';

@Component({
  selector: 'app-menu-lateral',
  templateUrl: './menu-lateral.component.html',
  styleUrls: ['./menu-lateral.component.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonList,
    IonMenuToggle,
    IonItem,
    IonLabel,
    IonIcon,
    RouterLink,
  ],
})
export class MenuLateralComponent {
  constructor() {
    addIcons({ footballOutline });
  }
}
