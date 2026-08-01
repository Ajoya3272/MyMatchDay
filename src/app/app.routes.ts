import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { CrearPartidoComponent } from './components/crear-partido/crear-partido.component';
import { InvitacionComponent } from './components/invitacion/invitacion.component';
import { DetallesPartidoComponent } from './components/detalles-partido/detalles-partido.component';
import { LoginComponent } from './components/login/login.component';
import { RegistroUsuarioComponent } from './components/registro-usuario/registro-usuario.component';
import { authGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'registro-usuario',
    component: RegistroUsuarioComponent,
    canActivate: [publicGuard],
  },
  {
    path: 'verificacion-usuario',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./components/verificacion-usuario/verificacion-usuario.component').then(
        (m) => m.VerificacionUsuarioComponent,
      ),
  },
  {
    path: 'home',
    component: HomeComponent,
    canActivate: [authGuard],
  },
  {
    path: 'crear-partido',
    component: CrearPartidoComponent,
    canActivate: [authGuard],
  },
  {
    path: 'invitacion/:slug',
    component: InvitacionComponent,
  },
  {
    path: 'detalles-partido',
    component: DetallesPartidoComponent,
    canActivate: [authGuard],
  },
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/mi-perfil/mi-perfil.component').then(
        (m) => m.MiPerfilComponent,
      ),
  },
  {
    path: 'ajustes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/ajustes/ajustes.component').then(
        (m) => m.AjustesComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
