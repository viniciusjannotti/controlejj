'use client';

import { MailCheck, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { Marca } from '@/components/Shell';
import { Botao, Carregando, Erro } from '@/components/ui';
import { mensagemErroLogin, useAuth } from '@/lib/client/auth';
import { firebaseConfigurado, modoDemo } from '@/lib/client/firebase';

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-lateral p-4">
      <div className="mb-6">
        <Marca />
      </div>
      <div className="w-full max-w-sm rounded-lg bg-painel p-5 text-tinta">{children}</div>
      <p className="mt-4 text-center text-xs text-lateral-tinta">Área restrita à equipe do Joga Junto.</p>
    </main>
  );
}

function Bloqueado({ codigo, email }: { codigo: string; email: string }) {
  const { verificarDeNovo, reenviarConfirmacao, sair } = useAuth();
  const [aviso, setAviso] = useState('');
  const [verificando, setVerificando] = useState(false);

  async function verificar() {
    setVerificando(true);
    setAviso('');
    await verificarDeNovo().catch(() => setAviso('Não foi possível verificar agora.'));
    setVerificando(false);
  }

  const semConfirmar = codigo === 'email_nao_verificado';
  return (
    <Moldura>
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-marca">{semConfirmar ? <MailCheck size={28} aria-hidden /> : <ShieldAlert size={28} aria-hidden />}</span>
        <h1 className="font-medium">{semConfirmar ? 'Confirme seu e-mail' : 'Acesso ainda não liberado'}</h1>
        <p className="text-sm text-tinta-2">
          {semConfirmar ? (
            <>Enviamos um link de confirmação para <strong className="break-all">{email}</strong>. Depois de clicar nele, volte aqui.</>
          ) : (
            <>O e-mail <strong className="break-all">{email}</strong> não está na lista da equipe. Peça a um administrador para liberá-lo na tela Equipe.</>
          )}
        </p>
        {aviso && <p role="status" className="text-sm text-tinta-2">{aviso}</p>}
        <div className="mt-2 flex w-full flex-col gap-2">
          <Botao variante="primario" carregando={verificando} onClick={() => void verificar()}>
            Já fiz isso, verificar de novo
          </Botao>
          {semConfirmar && (
            <Botao onClick={() => void reenviarConfirmacao().then(() => setAviso('Link reenviado.'), (e) => setAviso(mensagemErroLogin(e)))}>Reenviar link</Botao>
          )}
          <Botao variante="fantasma" onClick={() => void sair()}>
            Entrar com outra conta
          </Botao>
        </div>
      </div>
    </Moldura>
  );
}

export default function PaginaLogin() {
  const { estado, entrarGoogle, entrarEmail, criarConta, redefinirSenha, entrarDemo } = useAuth();
  const router = useRouter();
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    if (estado.fase === 'ok') router.replace('/');
  }, [estado.fase, router]);

  async function tentar(acao: () => Promise<void>) {
    setOcupado(true);
    setErro('');
    setAviso('');
    try {
      await acao();
    } catch (e) {
      const codigo = (e as { code?: string })?.code;
      if (codigo !== 'auth/popup-closed-by-user' && codigo !== 'auth/cancelled-popup-request') setErro(mensagemErroLogin(e));
    } finally {
      setOcupado(false);
    }
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    void tentar(() => (modo === 'entrar' ? entrarEmail(email, senha) : criarConta(email, senha)));
  }

  if (estado.fase === 'carregando' || estado.fase === 'ok') return <Carregando />;
  if (estado.fase === 'bloqueado') return <Bloqueado codigo={estado.codigo} email={estado.email} />;

  if (modoDemo) {
    return (
      <Moldura>
        <h1 className="font-medium">Modo demonstração</h1>
        <p className="mt-1 mb-4 text-sm text-tinta-2">O Firebase ainda não está configurado. Explore o QG com dados fictícios, salvos só neste computador.</p>
        <Botao variante="primario" className="w-full" onClick={entrarDemo}>
          Entrar na demonstração
        </Botao>
      </Moldura>
    );
  }

  if (!firebaseConfigurado) {
    return (
      <Moldura>
        <Erro mensagem="O login ainda não foi configurado neste servidor. Confira as variáveis de ambiente." />
      </Moldura>
    );
  }

  return (
    <Moldura>
      <h1 className="mb-4 font-medium">{modo === 'entrar' ? 'Entrar no QG' : 'Criar conta com e-mail'}</h1>

      <Botao className="w-full" disabled={ocupado} onClick={() => void tentar(entrarGoogle)}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
        </svg>
        Continuar com Google
      </Botao>

      <div className="my-4 flex items-center gap-3 text-xs text-tinta-3">
        <span className="h-px flex-1 bg-linha" />
        ou
        <span className="h-px flex-1 bg-linha" />
      </div>

      <form onSubmit={enviar} className="space-y-3">
        <div>
          <label htmlFor="email" className="mb-1 block text-[13px] font-medium text-tinta-2">E-mail</label>
          <input id="email" type="email" autoComplete="email" required className="campo" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="senha" className="mb-1 block text-[13px] font-medium text-tinta-2">Senha</label>
          <input id="senha" type="password" required minLength={6} autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        {erro && <Erro mensagem={erro} />}
        {estado.fase === 'erro' && !erro && <Erro mensagem={estado.mensagem} />}
        {aviso && <p role="status" className="text-sm text-tinta-2">{aviso}</p>}
        <Botao variante="primario" type="submit" className="w-full" carregando={ocupado}>
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </Botao>
      </form>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-[13px]">
        <button type="button" className="text-marca hover:underline" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(''); }}>
          {modo === 'entrar' ? 'Criar conta' : 'Já tenho conta'}
        </button>
        {modo === 'entrar' && (
          <button
            type="button"
            className="text-tinta-2 hover:underline"
            onClick={() => {
              if (!email) return setErro('Digite seu e-mail acima para receber o link.');
              void tentar(async () => {
                await redefinirSenha(email);
                setAviso('Se esse e-mail tiver conta, enviamos um link para redefinir a senha.');
              });
            }}
          >
            Esqueci a senha
          </button>
        )}
      </div>
    </Moldura>
  );
}
