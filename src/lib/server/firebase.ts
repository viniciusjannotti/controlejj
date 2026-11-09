// Firebase Admin SDK: só roda no servidor. Inicializa sob demanda para que
// o build não dependa das variáveis de ambiente.

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function env(nome: string): string {
  const valor = (process.env[nome] ?? '').trim().replace(/,$/, '').replace(/^"|"$/g, '');
  if (!valor) throw new ConfiguracaoAusente(nome);
  return valor;
}

export class ConfiguracaoAusente extends Error {
  constructor(nome: string) {
    super(`Variável de ambiente ${nome} não configurada.`);
    this.name = 'ConfiguracaoAusente';
  }
}

function app(): App {
  return (
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env('FIREBASE_PROJECT_ID'),
        clientEmail: env('FIREBASE_CLIENT_EMAIL'),
        privateKey: env('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
      }),
    })
  );
}

export const adminAuth = () => getAuth(app());
export const adminDb = () => getFirestore(app());
