# LeadFlow

LeadFlow é um CRM SaaS para gerenciamento de leads e oportunidades de venda.

O projeto foi desenvolvido como uma aplicação full-stack, com foco em uma arquitetura simples, organizada e preparada para evoluir para funcionalidades de automação, integrações e operação multiusuário.

## Objetivos

O LeadFlow tem como objetivos:

- centralizar leads;
- organizar leads em um pipeline de vendas;
- acompanhar o status de cada oportunidade;
- registrar atividades e interações;
- permitir isolamento dos dados por usuário;
- fornecer uma base para futuras automações e integrações.

O projeto também serve como projeto de portfólio, demonstrando desenvolvimento full-stack, APIs REST, autenticação, persistência, migrations e integração entre frontend e backend.

## Stack

### Backend

- Python 3.13+
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- JWT
- Argon2 para hashing de senhas

### Frontend

- Next.js
- React
- TypeScript
- shadcn/ui + Tailwind CSS v4

### Infraestrutura

- Docker
- Docker Compose
- PostgreSQL

## Arquitetura

```text
leadflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── services/
│   ├── alembic/
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   └── lib/
│   └── README.md
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Executando localmente

### 1. Clonar o projeto

```bash
git clone <repository-url>
cd leadflow
```

### 2. Iniciar o PostgreSQL

```bash
docker compose up -d
```

Verifique os containers:

```bash
docker compose ps
```

### 3. Configurar o backend

Entre no diretório:

```bash
cd backend
```

Crie o ambiente virtual:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Configure o arquivo `.env`:

```env
DATABASE_URL=postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow

JWT_SECRET_KEY=change-this-in-development
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Execute as migrations:

```bash
alembic upgrade head
```

Inicie a API:

```bash
uvicorn app.main:app --reload
```

A API estará disponível em:

```text
http://localhost:8000
```

Documentação Swagger:

```text
http://localhost:8000/docs
```

### 4. Configurar o frontend

Em outro terminal:

```bash
cd frontend
npm install
```

Crie `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Execute:

```bash
npm run dev
```

O frontend estará disponível em:

```text
http://localhost:3000
```

## Banco de dados

O ambiente de desenvolvimento utiliza PostgreSQL executado através do Docker Compose.

As alterações de estrutura do banco são controladas pelo Alembic.

Para aplicar as migrations:

```bash
cd backend
alembic upgrade head
```

Para criar uma migration:

```bash
alembic revision --autogenerate -m "description"
```

## Autenticação

A API utiliza autenticação baseada em JWT.

O fluxo atual é:

```text
Login
  │
  ▼
POST /api/v1/auth/login
  │
  ▼
JWT
  │
  ▼
Frontend
  │
  ▼
Authorization: Bearer <token>
  │
  ▼
API
```

Os dados dos leads são associados ao usuário autenticado, impedindo que um usuário consulte diretamente os leads pertencentes a outro usuário.

## API

Principais endpoints atuais:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login

GET    /api/v1/leads
POST   /api/v1/leads
GET    /api/v1/leads/{id}
PATCH  /api/v1/leads/{id}

GET    /api/v1/leads/{id}/activities
POST   /api/v1/leads/{id}/activities

GET    /health
```

A documentação completa pode ser consultada através do Swagger:

```text
http://localhost:8000/docs
```

## Funcionalidades

### Implementadas

- [x] Estrutura inicial do projeto
- [x] PostgreSQL
- [x] SQLAlchemy
- [x] Alembic
- [x] CRUD básico de leads
- [x] Cadastro de usuários
- [x] Login
- [x] JWT
- [x] Isolamento de leads por usuário
- [x] Frontend Next.js
- [x] Dashboard
- [x] Kanban de leads
- [x] Histórico de atividades
- [x] Tela de detalhes do lead
- [x] Edição de leads pelo frontend
- [x] Alteração de status pelo frontend
- [x] Timeline de atividades
- [x] Criação de leads
- [x] Listagem de leads com busca e filtro por status
- [x] Kanban com alteração de status por arrastar e soltar

### Pendentes

- [ ] Finalizar revisão visual e responsiva da interface
- [ ] Adicionar testes automatizados de backend e frontend
- [ ] Dashboard com métricas
- [ ] Follow-ups, tarefas e lembretes
- [ ] Webhooks e automações
- [ ] Integração com WhatsApp
- [ ] Observabilidade e hardening para produção
- [ ] Deploy e demo online

## Roadmap

M1–M4 (CRUD, autenticação, pipeline e atividades) estão implementados. Os próximos marcos são:

```text
M4.5  Revisão visual, responsividade e consistência da UI
M5    Métricas e testes automatizados
M6    Follow-ups, tarefas e lembretes
M7    Webhooks, automações e integrações
M8    Observabilidade, produção e deploy
```

## Licença

Projeto desenvolvido para fins de estudo, portfólio e experimentação.
