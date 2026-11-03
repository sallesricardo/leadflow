# LeadFlow Backend

Backend da aplicação LeadFlow.

O backend fornece uma API REST responsável por autenticação, gerenciamento de leads, persistência dos dados e histórico de atividades.

O endpoint `GET /api/v1/tasks` lista as tarefas do usuário autenticado. Tarefas são criadas em `POST /api/v1/tasks` (associadas a um lead) e atualizadas em `PATCH /api/v1/tasks/{id}`. Cada tarefa tem título, descrição opcional, prazo e estado de conclusão.

## Stack

- Python 3.13 ou superior (conforme `pyproject.toml`)
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Pydantic
- PyJWT
- pwdlib + Argon2

## Estrutura

```text
backend/
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   └── leads.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── lead.py
│   │   └── lead_activity.py
│   │
│   ├── repositories/
│   │   ├── lead.py
│   │   └── lead_activity.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── lead.py
│   │   └── lead_activity.py
│   │
│   └── services/
│
├── alembic/
│   └── versions/
│
├── .env
├── .env.example
├── alembic.ini
├── requirements.txt
└── README.md
```

## Instalação

Na raiz do projeto:

```bash
cd backend
```

Crie o ambiente virtual:

```bash
python3.13 -m venv .venv
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

## Configuração

Crie o arquivo `.env`:

```env
DATABASE_URL=postgresql+psycopg://leadflow:leadflow@localhost:5432/leadflow

JWT_SECRET_KEY=change-this-in-development
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Banco de dados

O PostgreSQL é executado pelo Docker Compose localizado na raiz do projeto.

```bash
docker compose up -d
```

Execute as migrations:

```bash
alembic upgrade head
```

## Migrations

Criar uma migration:

```bash
alembic revision --autogenerate -m "description"
```

Aplicar migrations:

```bash
alembic upgrade head
```

Voltar uma migration:

```bash
alembic downgrade -1
```

Consultar o histórico:

```bash
alembic history
```

## Executando a API

```bash
uvicorn app.main:app --reload
```

API:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

Health check:

```text
GET /health
```

## Autenticação

O backend utiliza JWT para autenticação.

### Cadastro

```http
POST /api/v1/auth/register
Content-Type: application/json
```

Exemplo:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Exemplo:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Resposta:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

Endpoints protegidos devem receber:

```http
Authorization: Bearer <jwt>
```

## Leads

Cada lead pertence a um usuário.

A API sempre utiliza o usuário autenticado para limitar as consultas e alterações aos seus próprios dados.

### Criar

```http
POST /api/v1/leads
```

### Listar

```http
GET /api/v1/leads
```

### Consultar

```http
GET /api/v1/leads/{id}
```

### Atualizar

```http
PATCH /api/v1/leads/{id}
```

## Atividades

Atividades representam interações relacionadas a um lead.

Tipos previstos:

```text
NOTE
CALL
MESSAGE
EMAIL
STATUS_CHANGE
```

Endpoints:

```text
GET  /api/v1/leads/{id}/activities
POST /api/v1/leads/{id}/activities

GET  /api/v1/dashboard/metrics

GET   /api/v1/tasks
POST  /api/v1/tasks
PATCH /api/v1/tasks/{id}
```

## Métricas do dashboard

`GET /api/v1/dashboard/metrics` retorna, para o usuário autenticado, o total de leads, a contagem por etapa, a taxa de conversão entre ganhos e leads concluídos, os valores ganhos/perdidos e o desempenho por origem.

## Tarefas e lembretes

As tarefas pertencem ao usuário autenticado e ficam associadas a um lead desse usuário. Cada tarefa inclui título, observações opcionais, prazo e estado de conclusão. Tarefas vencidas aparecem destacadas na interface.

## Testes

Ainda não há testes automatizados no repositório. Quando forem adicionados, execute com:

```bash
pytest
```

## Princípios

O backend procura manter uma separação clara entre:

```text
API
 │
 ▼
Schemas
 │
 ▼
Repositories / Services
 │
 ▼
Models
 │
 ▼
Database
```

A autenticação e configurações ficam concentradas em `core`.

A lógica específica de persistência fica nos repositories, enquanto regras de negócio mais complexas deverão ser introduzidas em `services` conforme o projeto evoluir.
