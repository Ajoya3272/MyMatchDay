import { inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Route,
  Router,
  UrlSegment,
} from '@angular/router';
import { Auth, authState, signOut } from '@angular/fire/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map((user) => {
      return user
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url },
          });
    }),
  );
};

export const publicGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const vieneDeVerificacion = route.queryParamMap.get('verified') === '1';

  if (vieneDeVerificacion) {
    /*
     * Al llegar desde el flujo de verificación de email, cualquier
     * sesión que ya hubiera cacheada en este navegador pertenece a
     * otra cuenta probada antes. La cerramos para forzar login
     * manual con las credenciales reales.
     */
    return signOut(auth).then(() => true);
  }

  return authState(auth).pipe(
    take(1),
    map((user) => {
      return user ? router.createUrlTree(['/home']) : true;
    }),
  );
};

export const invitacionGuard: CanMatchFn = (
  _route: Route,
  segments: UrlSegment[],
) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const returnUrl = '/' + segments.map((segment) => segment.path).join('/');

  return authState(auth).pipe(
    take(1),
    map((user) => {
      return user
        ? true
        : router.createUrlTree(['/login'], {
            queryParams: { returnUrl },
          });
    }),
  );
};
