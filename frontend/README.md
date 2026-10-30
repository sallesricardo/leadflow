# LeadFlow Frontend

Frontend da aplicação LeadFlow.

O frontend fornece a interface para autenticação, visualização do pipeline de leads e gerenciamento das informações do CRM.

## Stack

- Next.js
- React
- TypeScript
- CSS Modules

## Estrutura

```text
frontend/
├── src/
│   ├── app/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── page.module.css
│   │   │
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── page.module.css
│   │   │
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
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
NEXT_PUBLIC_API_URL=http://localhost:8000
```

A variável define o endereço da API utilizada pelo frontend.

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

Após o login, o JWT é armazenado localmente e enviado nas requisições protegidas através do header:

```http
Authorization: Bearer <token>
```

## Comunicação com a API

As requisições são centralizadas em:

```text
src/lib/api.ts
```

Exemplo:

```typescript
apiFetch<Lead[]>("/api/v1/leads", {
  token,
});
```

Isso evita duplicação da lógica de comunicação com o backend.

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

### Em desenvolvimento

- [ ] Cadastro de usuário
- [ ] Criar lead
- [ ] Editar lead
- [ ] Tela de detalhes
- [ ] Alterar status
- [ ] Timeline de atividades
- [ ] Dashboard com métricas
- [ ] Follow-ups
- [ ] Tarefas
- [ ] Responsividade aprimorada

## Desenvolvimento

O frontend utiliza CSS Modules em vez de um framework de CSS utilitário.

Os componentes e páginas devem permanecer preferencialmente próximos ao contexto funcional ao qual pertencem.

A comunicação com o backend deve passar por `src/lib/api.ts`.

Tipos compartilhados entre as páginas devem ser definidos em `src/lib/types.ts`.

## Produção

As configurações específicas de produção deverão ser fornecidas através de variáveis de ambiente.

A URL da API deve ser configurada através de:

```env
NEXT_PUBLIC_API_URL=<api-url>
```
