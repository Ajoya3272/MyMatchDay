// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: 'AIzaSyCLFtYUGlIkYwDhtPRjrO2-nh4YORY0LrA',
  authDomain: 'football-app-18c93.firebaseapp.com',
  projectId: 'football-app-18c93',
  storageBucket: 'football-app-18c93.firebasestorage.app',
  messagingSenderId: '856738938096',
  appId: '1:856738938096:web:f884860a9d416d0561d635',
  measurementId: 'G-V5MHH501XM',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
