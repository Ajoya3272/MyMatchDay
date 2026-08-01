import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withEnabledBlockingInitialNavigation,
} from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';
import { firebaseConfig } from '../enviroments/enviroment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideIonicAngular(),

    provideFirebaseApp(() => initializeApp(firebaseConfig)),

    provideAuth(() => getAuth()),

    provideFirestore(() => getFirestore()),

    provideRouter(routes, withEnabledBlockingInitialNavigation()),

    provideAnimationsAsync(),
  ],
};
