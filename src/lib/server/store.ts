// ============================================================
// Acesso a dados. Em produção é sempre o Firestore. O arquivo
// local .data/demo.json existe só para `npm run dev` sem Firebase
// e nunca é usado num build de produção (ver isDemo).
// ============================================================

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { adminDb } from './firebase';
import { criarDadosDemo } from './demo-seed';

export type Doc = Record<string, unknown> & { id: string };

export interface Store {
  list(colecao: string): Promise<Doc[]>;
  get(colecao: string, id: string): Promise<Doc | null>;
  create(colecao: string, dados: Record<string, unknown>, id?: string): Promise<Doc>;
  update(colecao: string, id: string, dados: Record<string, unknown>): Promise<Doc | null>;
  remove(colecao: string, id: string): Promise<boolean>;
  /** Cria ou mescla vários documentos de uma vez. */
  bulkMerge(colecao: string, itens: { id: string; dados: Record<string, unknown> }[]): Promise<void>;
  recentes(colecao: string, campoData: string, limite: number): Promise<Doc[]>;
}

/** Só em desenvolvimento e só sem Firebase. `next build` fixa NODE_ENV=production. */
export function isDemo(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.FIREBASE_PROJECT_ID;
}

const limpar = (dados: Record<string, unknown>) => JSON.parse(JSON.stringify(dados)) as Record<string, unknown>;

const firestoreStore: Store = {
  async list(colecao) {
    const snap = await adminDb().collection(colecao).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  },
  async get(colecao, id) {
    const d = await adminDb().collection(colecao).doc(id).get();
    return d.exists ? { ...d.data(), id: d.id } : null;
  },
  async create(colecao, dados, id) {
    const col = adminDb().collection(colecao);
    const ref = id ? col.doc(id) : col.doc();
    const limpo = limpar(dados);
    await ref.set(limpo);
    return { ...limpo, id: ref.id };
  },
  async update(colecao, id, dados) {
    const ref = adminDb().collection(colecao).doc(id);
    const limpo = limpar(dados);
    const atualizado = await adminDb().runTransaction(async (tx) => {
      const atual = await tx.get(ref);
      if (!atual.exists) return null;
      tx.update(ref, limpo);
      return { ...atual.data(), ...limpo, id };
    });
    return atualizado;
  },
  async remove(colecao, id) {
    const ref = adminDb().collection(colecao).doc(id);
    const atual = await ref.get();
    if (!atual.exists) return false;
    await ref.delete();
    return true;
  },
  async bulkMerge(colecao, itens) {
    const db = adminDb();
    for (let i = 0; i < itens.length; i += 400) {
      const lote = db.batch();
      for (const { id, dados } of itens.slice(i, i + 400)) {
        lote.set(db.collection(colecao).doc(id), limpar(dados), { merge: true });
      }
      await lote.commit();
    }
  },
  async recentes(colecao, campoData, limite) {
    const snap = await adminDb().collection(colecao).orderBy(campoData, 'desc').limit(limite).get();
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  },
};

// ---- Modo demonstração --------------------------------------------

type Banco = Record<string, Record<string, Record<string, unknown>>>;
const ARQUIVO_DEMO = path.join(process.cwd(), '.data', 'demo.json');

function lerBanco(): Banco {
  if (!fs.existsSync(ARQUIVO_DEMO)) {
    const inicial = criarDadosDemo();
    gravarBanco(inicial);
    return inicial;
  }
  return JSON.parse(fs.readFileSync(ARQUIVO_DEMO, 'utf8')) as Banco;
}

function gravarBanco(banco: Banco) {
  fs.mkdirSync(path.dirname(ARQUIVO_DEMO), { recursive: true });
  fs.writeFileSync(ARQUIVO_DEMO, JSON.stringify(banco, null, 2));
}

const demoStore: Store = {
  async list(colecao) {
    return Object.entries(lerBanco()[colecao] ?? {}).map(([id, d]) => ({ ...d, id }));
  },
  async get(colecao, id) {
    const d = lerBanco()[colecao]?.[id];
    return d ? { ...d, id } : null;
  },
  async create(colecao, dados, id = randomUUID()) {
    const banco = lerBanco();
    banco[colecao] = { ...banco[colecao], [id]: limpar(dados) };
    gravarBanco(banco);
    return { ...limpar(dados), id };
  },
  async update(colecao, id, dados) {
    const banco = lerBanco();
    const atual = banco[colecao]?.[id];
    if (!atual) return null;
    banco[colecao][id] = { ...atual, ...limpar(dados) };
    gravarBanco(banco);
    return { ...banco[colecao][id], id };
  },
  async remove(colecao, id) {
    const banco = lerBanco();
    if (!banco[colecao]?.[id]) return false;
    delete banco[colecao][id];
    gravarBanco(banco);
    return true;
  },
  async bulkMerge(colecao, itens) {
    const banco = lerBanco();
    banco[colecao] ??= {};
    for (const { id, dados } of itens) banco[colecao][id] = { ...banco[colecao][id], ...limpar(dados) };
    gravarBanco(banco);
  },
  async recentes(colecao, campoData, limite) {
    const docs = await demoStore.list(colecao);
    return docs.sort((a, b) => String(b[campoData] ?? '').localeCompare(String(a[campoData] ?? ''))).slice(0, limite);
  },
};

export const store = (): Store => (isDemo() ? demoStore : firestoreStore);
