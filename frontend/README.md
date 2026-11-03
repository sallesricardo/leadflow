# LeadFlow Frontend

Frontend da aplicação LeadFlow.

O frontend fornece a interface para autenticação, visualização do pipeline de leads e gerenciamento das informações do CRM.

## Stack

- Next.js
- Tailwind CSS v4
- shadcn/ui com Base UI
- React
- TypeScript
- Lucide React

## Estrutura

```text
frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── [...path]/route.ts
│   │   ├── login/
│   │   │   └── page.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   └── leads/
│   │   │       ├── page.tsx
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/page.tsx
│   │   │
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── app-sidebar.tsx
│   │   └── lead-kanban.tsx
│   └── lib/
│       ├── api.ts
│       └── types.ts
│
├── public/
├── .env.local
├── .env.example
├── package.json
└── README.md
```

## Instalação

Na raiz do projeto:

```bash
cd frontend
```

Instale as dependências:

```bash
npm install
```

## Configuração

Crie `.env.local`:

```env
BACKEND_API_URL=http://localhost:8000
```

A variável define o endereço do backend usado exclusivamente pelo servidor Next.js. O navegador chama as rotas BFF do próprio frontend.

## Desenvolvimento

Execute:

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:3000
```

## Build

Criar uma build de produção:

```bash
npm run build
```

Executar a build:

```bash
npm start
```

## Lint

```bash
npm run lint
```

## Autenticação

O frontend realiza login através da API:

```text
POST /api/v1/auth/login
```

Após o login, o BFF guarda o JWT em um cookie `HttpOnly`, `Secure` em produção e `SameSite=Strict`. O token não é retornado ao JavaScript do navegador nem armazenado em `localStorage`.

## Comunicação com a API

O Route Handler `src/app/api/[...path]/route.ts` implementa o BFF: encaminha as rotas `/api/v1/*` ao backend configurado em `BACKEND_API_URL`, controla login/logout e mantém o JWT no cookie de sessão HttpOnly. Requisições que alteram dados também validam a origem.

As requisições são centralizadas em:

```text
src/lib/api.ts
```

Exemplo:

```typescript
apiFetch<Lead[]>("/api/v1/leads");
```

O BFF encaminha a chamada ao backend e adiciona o JWT da sessão no servidor. Isso centraliza a comunicação com a API e evita expor o token ao navegador.

## Dashboard

O dashboard apresenta os leads organizados em um pipeline Kanban:

```text
NEW
 │
 ▼
CONTACTED
 │
 ▼
QUALIFIED
 │
 ▼
PROPOSAL
 │
 ▼
NEGOTIATION
 │
 ├──► WON
 │
 └──► LOST
```

## Funcionalidades

### Implementadas

- [x] Página de login
- [x] Autenticação com API
- [x] Dashboard
- [x] Kanban de leads
- [x] Logout
- [x] Comunicação centralizada com API
- [x] Listagem de leads com busca e filtro por status
- [x] Criação de lead com validação e feedback
- [x] Tela de detalhes e edição de lead
- [x] Alteração de status e timeline de atividades
- [x] Kanban com arrastar e soltar

### Pendentes

- [ ] Interface de cadastro de usuário (a API de registro já existe)
- [x] Revisar responsividade, incluindo o uso do Kanban em dispositivos móveis
- [x] Finalizar consistência visual entre login, dashboard e detalhes
- [ ] Adicionar testes automatizados relevantes
- [x] Dashboard com métricas de etapas, conversão, valores e origens
- [x] Tarefas e lembretes vinculados a leads

## Desenvolvimento

O frontend usa Tailwind CSS v4 e componentes shadcn/ui com Base UI. A home redireciona para login, e as telas de login, dashboard e detalhes compartilham o mesmo sistema de estilos.

Os componentes e páginas devem permanecer preferencialmente próximos ao contexto funcional ao qual pertencem.

A comunicação com o backend deve passar por `src/lib/api.ts`.

Tipos compartilhados entre as páginas devem ser definidos em `src/lib/types.ts`.

## Produção

As configurações específicas de produção deverão ser fornecidas através de variáveis de ambiente.

A URL da API deve ser configurada através de:

```env
BACKEND_API_URL=<api-url>
```
