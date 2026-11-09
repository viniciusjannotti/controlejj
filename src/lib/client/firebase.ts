// Firebase no navegador: usado só para login. Os dados passam pelas rotas /api.

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigurado = Boolean(config.apiKey);
export const modoDemo = process.env.NODE_ENV === 'development' && !firebaseConfigurado;

export function authCliente(): Auth {
  return getAuth(getApps().length ? getApp() : initializeApp(config));
}
