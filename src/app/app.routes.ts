import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CrearPartidoComponent } from './components/crear-partido/crear-partido.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'crear-partido',
    component: CrearPartidoComponent,
  },
];
