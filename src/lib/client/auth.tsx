'use client';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_TOKEN, type Membro } from '@/lib/schema';
import { api, definirObterToken, ErroApi } from './api';
import { authCliente, firebaseConfigurado, modoDemo } from './firebase';

export type EstadoAuth =
  | { fase: 'carregando' }
  | { fase: 'deslogado' }
  | { fase: 'bloqueado'; codigo: string; email: string }
  | { fase: 'erro'; mensagem: string }
  | { fase: 'ok'; membro: Membro };

interface ContextoAuth {
  estado: EstadoAuth;
  entrarGoogle(): Promise<void>;
  entrarEmail(email: string, senha: string): Promise<void>;
  criarConta(email: string, senha: string): Promise<void>;
  redefinirSenha(email: string): Promise<void>;
  reenviarConfirmacao(): Promise<void>;
  /** Refaz a checagem depois de confirmar o e-mail ou receber acesso. */
  verificarDeNovo(): Promise<void>;
  entrarDemo(): void;
  sair(): Promise<void>;
}

const Contexto = createContext<ContextoAuth | null>(null);
const CHAVE_DEMO = 'qg-demo';

const lerDemo = () => {
  try {
    return localStorage.getItem(CHAVE_DEMO) === '1';
  } catch {
    return false;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAuth>({ fase: 'carregando' });

  const carregarMembro = useCallback(async (email: string) => {
    try {
      setEstado({ fase: 'ok', membro: await api<Membro>('/api/me') });
    } catch (e) {
      if (e instanceof ErroApi && (e.codigo === 'sem_convite' || e.codigo === 'email_nao_verificado')) {
        setEstado({ fase: 'bloqueado', codigo: e.codigo, email });
      } else {
        setEstado({ fase: 'erro', mensagem: e instanceof Error ? e.message : 'Não foi possível entrar.' });
      }
    }
  }, []);

  useEffect(() => {
    if (modoDemo) {
      definirObterToken(async () => (lerDemo() ? DEMO_TOKEN : null));
      queueMicrotask(() => {
        if (lerDemo()) void carregarMembro('');
        else setEstado({ fase: 'deslogado' });
      });
      return;
    }
    if (!firebaseConfigurado) {
      queueMicrotask(() => setEstado({ fase: 'erro', mensagem: 'O login ainda não foi configurado neste servidor.' }));
      return;
    }
    const auth = authCliente();
    definirObterToken(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
    return onAuthStateChanged(auth, (u) => {
      if (u) void carregarMembro(u.email ?? '');
      else setEstado({ fase: 'deslogado' });
    });
  }, [carregarMembro]);

  const valor = useMemo<ContextoAuth>(
    () => ({
      estado,
      async entrarGoogle() {
        await signInWithPopup(authCliente(), new GoogleAuthProvider());
      },
      async entrarEmail(email, senha) {
        await signInWithEmailAndPassword(authCliente(), email, senha);
      },
      async criarConta(email, senha) {
        const { user } = await createUserWithEmailAndPassword(authCliente(), email, senha);
        await sendEmailVerification(user);
      },
      async redefinirSenha(email) {
        await sendPasswordResetEmail(authCliente(), email);
      },
      async reenviarConfirmacao() {
        const u = authCliente().currentUser;
        if (u) await sendEmailVerification(u);
      },
      async verificarDeNovo() {
        const u = authCliente().currentUser;
        if (!u) return;
        // O token guarda "e-mail verificado": precisa ser renovado para valer.
        await u.reload();
        await u.getIdToken(true);
        await carregarMembro(u.email ?? '');
      },
      entrarDemo() {
        try {
          localStorage.setItem(CHAVE_DEMO, '1');
        } catch {
          // Sem armazenamento, a sessão de demonstração não sobrevive a recarregar.
        }
        definirObterToken(async () => DEMO_TOKEN);
        void carregarMembro('');
      },
      async sair() {
        if (modoDemo) {
          try {
            localStorage.removeItem(CHAVE_DEMO);
          } catch {
            // nada a limpar
          }
          definirObterToken(async () => null);
          setEstado({ fase: 'deslogado' });
          return;
        }
        await signOut(authCliente());
      },
    }),
    [estado, carregarMembro],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth(): ContextoAuth {
  const c = useContext(Contexto);
  if (!c) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return c;
}

/** Quem está logado. Só use dentro das páginas protegidas. */
export function useMembro(): Membro {
  const { estado } = useAuth();
  if (estado.fase !== 'ok') throw new Error('useMembro usado fora da área logada');
  return estado.membro;
}

/** Traduz os códigos de erro do Firebase para mensagens úteis. */
export function mensagemErroLogin(e: unknown): string {
  const codigo = (e as { code?: string })?.code ?? '';
  const mapa: Record<string, string> = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/email-already-in-use': 'Já existe uma conta com esse e-mail. Tente entrar.',
    'auth/weak-password': 'Use uma senha com pelo menos 6 caracteres.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
    'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.',
    'auth/unauthorized-domain': 'Este endereço ainda não está autorizado no Firebase.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet.',
  };
  return mapa[codigo] ?? 'Não foi possível entrar. Tente de novo.';
}
