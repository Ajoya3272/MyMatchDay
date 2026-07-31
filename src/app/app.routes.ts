import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CrearPartidoComponent } from './components/crear-partido/crear-partido.component';
import { InvitacionComponent } from './components/invitacion/invitacion.component';
import { DetallesPartidoComponent } from './components/detalles-partido/detalles-partido.component';
import { LoginComponent } from './components/login/login.component';
import { RegistroUsuarioComponent } from './components/registro-usuario/registro-usuario.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'registro-usuario',
    component: RegistroUsuarioComponent,
  },
  {
    path: 'home',
    component: HomeComponent,
  },
  {
    path: 'crear-partido',
    component: CrearPartidoComponent,
  },
  {
    path: 'invitacion/:slug',
    component: InvitacionComponent,
  },
  {
    path: 'detalles-partido',
    component: DetallesPartidoComponent,
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
