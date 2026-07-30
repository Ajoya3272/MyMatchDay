import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonMenuToggle,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-menu-lateral',
  templateUrl: './menu-lateral.component.html',
  styleUrls: ['./menu-lateral.component.scss'],
  standalone: true,
  imports: [IonContent, IonList, IonMenuToggle, IonItem, IonLabel, RouterLink],
})
export class MenuLateralComponent implements OnInit {
  constructor() {}

  ngOnInit() {}
}
