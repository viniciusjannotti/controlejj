# QG Joga Junto

Central de planejamento da equipe do Joga Junto: tarefas, metas, roadmap, agenda, contatos, projetos e um conselheiro de IA que lê tudo isso para sugerir os próximos movimentos.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS 4 · Firebase (Auth e Firestore) · Gemini API · Vercel

## Ver funcionando agora

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Sem o Firebase configurado, o app entra em **modo demonstração**, com dados fictícios salvos em `.data/demo.json`. Para recomeçar, apague esse arquivo. Esse modo só existe em `npm run dev`: em produção ele não funciona.

O conselheiro de IA precisa de `GEMINI_API_KEY` no `.env.local`, mesmo na demonstração.

## Colocar no ar

### 1. Firebase

Use um projeto **separado** do Mapa Joga Junto, para isolar os dados internos do QG.

1. Crie o projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Método de login:** ative **Google** e **E-mail/senha**.
3. **Firestore Database:** crie o banco em modo produção, região `southamerica-east1`.
4. **Configurações do projeto → Geral → Seus apps:** adicione um app Web e copie as variáveis `NEXT_PUBLIC_*`.
5. **Configurações do projeto → Contas de serviço → Gerar nova chave privada:** copie os dados para as variáveis `FIREBASE_*`. Nunca versione esse arquivo.
6. Publique as regras, que negam todo acesso direto ao banco:

   ```bash
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore:rules
   ```

### 2. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha. Em `ADMIN_EMAILS`, coloque o e-mail da pessoa administradora: é ela quem libera as demais.

### 3. Chave da IA

Crie a chave em [aistudio.google.com/apikey](https://aistudio.google.com/apikey) e coloque em `GEMINI_API_KEY`. O padrão é `gemini-3.6-flash`, com cota gratuita; para trocar, use `GEMINI_MODEL`. No plano gratuito, o `gemini-3.8-flash` chegou a levar mais de 100 segundos por resposta.

**Sobre o plano gratuito:** os termos do Gemini dizem que, sem faturamento ativo, o Google pode usar o que é enviado para melhorar os produtos, com revisão humana, e pedem para não enviar informação pessoal. Por isso o QG troca nomes por códigos e remove telefones e e-mails antes de cada envio (ver abaixo). Um nome que não está cadastrado e foi digitado num texto livre ainda pode passar. Para a IA não usar os dados, ative o faturamento no projeto da chave: com o volume de uma equipe, o custo é de centavos.

### 4. Vercel

1. Suba o repositório para o GitHub e importe em [vercel.com/new](https://vercel.com/new).
2. Em **Settings → Environment Variables**, cadastre todas as variáveis. Cole a `FIREBASE_PRIVATE_KEY` com os `\n` literais.
3. Faça o deploy.
4. No Firebase, em **Authentication → Configurações → Domínios autorizados**, adicione o domínio da Vercel. Sem isso, o login com Google falha.

As funções rodam em São Paulo (`gru1`, em `vercel.json`), perto do Firestore.

### 5. Primeiro acesso

Entre com o e-mail de `ADMIN_EMAILS`. Na tela **Equipe**, libere os e-mails das outras pessoas. Depois, traga os dados do mapa pela tela **Importar**.

## Como o acesso funciona

- O login prova quem é a pessoa. A coleção `equipe` decide se ela entra, e isso é conferido no servidor a cada requisição. Conta Google fora da lista não vê nada, e remover alguém vale na hora.
- Contas com senha precisam confirmar o e-mail. Sem isso, alguém poderia criar uma conta usando o e-mail de um membro que ainda não entrou.
- Todos os membros veem e editam tudo. O administrador também gerencia a lista da equipe.
- O navegador nunca acessa o Firestore direto: tudo passa por `src/app/api`, que valida os dados com Zod.

## Importação do Mapa Joga Junto

A tela **Importar** aceita os CSVs do botão "Exportar CSV" do painel do mapa e também o JSON de seed.

| Arquivo | O que acontece |
|---|---|
| Projetos | Cria ou atualiza projetos e, se marcado, cria contatos dos responsáveis |
| Inscrições | **Só totais por projeto.** O arquivo é lido no navegador e nomes, telefones e dados de menores não são enviados |
| Contatos | Qualquer planilha com coluna Nome (aceita Telefone, E-mail, Cargo, Empresa, Observações) |

Reimportar é seguro: atualiza os dados vindos do mapa sem duplicar e sem apagar o que a equipe escreveu no QG.

## Conselheiro de IA

- Antes de cada resposta, recebe uma foto dos dados do QG, montada em `src/lib/server/ai-context.ts` por lista de campos permitidos.
- **Pessoas viram códigos:** `[E1]` para a equipe, `[C1]` para contatos e `[R1]` para responsáveis de projeto. Telefones e e-mails, inclusive os digitados em textos livres, são removidos (`src/lib/pseudonimos.ts`). A tela troca os códigos de volta pelos nomes.
- Ele pode propor tarefas, mas só cria algo quando uma pessoa aprova.
- O texto cadastrado, incluindo o que veio de formulários públicos do mapa, é tratado como dado e não como instrução.
- As conversas ficam só na aba do navegador e não são salvas no banco.
- Mesmo com códigos, o restante dos textos passa pela API do Google: considere isso na política de privacidade do projeto.

## Comandos

```bash
npm run dev        # desenvolvimento
npm run build      # build de produção
npm test           # testes
npm run lint       # lint
npm run typecheck  # tipos
```

## Estrutura

```
src/
├── app/
│   ├── (app)/       # telas logadas: painel, tarefas, metas, roadmap, agenda,
│   │                # contatos, projetos, informacoes, ia, importar, equipe
│   ├── login/
│   └── api/         # me, data/[collection], team, import, atividade, ai
├── components/      # ui, Formulario, campos, Shell
└── lib/
    ├── schema.ts    # modelo de dados e validação
    ├── import.ts    # leitura e conversão de CSV/JSON
    ├── client/      # login e chamadas à API
    └── server/      # Firebase, banco, acesso, contexto da IA, dados de demonstração
```
