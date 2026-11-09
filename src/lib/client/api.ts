// Chamadas às rotas /api com o token de quem está logado.

export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(message);
    this.name = 'ErroApi';
  }
}

let obterToken: () => Promise<string | null> = async () => null;

export function definirObterToken(fn: () => Promise<string | null>) {
  obterToken = fn;
}

export async function cabecalhosAuth(): Promise<Record<string, string>> {
  const token = await obterToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api<T = unknown>(caminho: string, opcoes: { metodo?: string; corpo?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(caminho, {
      method: opcoes.metodo ?? 'GET',
      headers: { ...(await cabecalhosAuth()), ...(opcoes.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: opcoes.corpo !== undefined ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Verifique a internet e tente de novo.', 0);
  }
  if (res.status === 204) return undefined as T;
  const dados = await res.json().catch(() => null);
  if (!res.ok) throw new ErroApi(dados?.erro ?? 'Não foi possível concluir a ação.', res.status, dados?.codigo);
  return dados as T;
}
