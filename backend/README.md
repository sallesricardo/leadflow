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

`/health` verifica que o processo HTTP está ativo. `GET /health/ready` verifica também a conexão com o banco e retorna `503` quando a API não está pronta para atender requisições. As requisições da API são registradas com método, caminho, status, duração e `X-Request-ID`; não registre tokens nem corpos de requisição.

### Execução com Docker Compose

Na raiz do repositório, inicie o PostgreSQL e a API. O serviço da API aplica as migrations antes de iniciar o servidor:

```bash
docker compose up -d --build
```

API e Swagger ficam disponíveis em `http://localhost:8000` e `http://localhost:8000/docs`. O Compose inicia também o worker de webhooks depois que a API fica saudável. O Compose usa um segredo de desenvolvimento padrão; defina `JWT_SECRET_KEY` no ambiente antes de iniciar se precisar substituí-lo.

Para construir somente a imagem da API:

```bash
docker build -f backend/Dockerfile -t leadflow-api backend
```

O container respeita `PORT`; localmente usa `8000`, enquanto o Blueprint Render define `10000`. URLs `postgres://` e `postgresql://` são convertidas internamente para o driver psycopg v3, instalado pela dependência do projeto.

## Testes

Para rodar a suíte em container isolado, a partir da raiz do repositório:

```bash
docker compose --profile test run --build --rm test
```

O container de testes não inicia nem acessa o PostgreSQL. Os testes HTTP sobem um servidor temporário em loopback dentro do container e usam SQLite em memória.

Antes de expor a API publicamente, configure rate limiting compartilhado no proxy ou gateway de entrada, pelo menos para cadastro e login. Não há rate limiter por processo na API.

Para executar localmente, instale as dependências de teste e rode o pytest:

```bash
pip install -r requirements-test.txt
pytest
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

## Webhooks

Usuários autenticados podem cadastrar destinos HTTPS em `POST /api/v1/webhooks`, listar em `GET /api/v1/webhooks`, pausar/reativar e atualizar o token em `PATCH /api/v1/webhooks/{id}`, consultar as últimas entregas em `GET /api/v1/webhooks/{id}/deliveries`, reenfileirar entregas falhas em `POST /api/v1/webhooks/{id}/deliveries/{delivery_id}/retry` e remover destinos em `DELETE /api/v1/webhooks/{id}`. Os eventos disponíveis são `lead.created`, `lead.updated`, `lead.status_changed`, `task.created`, `task.completed` e `task.reopened`. O segredo HMAC é retornado apenas na criação; um token Bearer opcional é enviado no cabeçalho `Authorization` e nunca retornado pela API. O receptor valida `X-LeadFlow-Signature` como HMAC-SHA256 do corpo bruto. Os payloads de lead contêm e-mail, telefone e observações; os de tarefa incluem título, descrição, prazo e lead associado.

As entregas ficam numa fila persistida no banco e usam retentativas com espera crescente. Com Docker Compose, o serviço `webhook-worker` processa a fila automaticamente. Os logs do worker registram sucesso, pausa, nova tentativa e falha definitiva com IDs da entrega/destino, tipo de evento, tentativa, status HTTP e espera até a próxima tentativa. O texto bruto dos erros não é escrito nos logs, para não expor detalhes da URL configurada. Para execução direta no host, rode em outro terminal dentro de `backend/`:

Para acompanhar o serviço do Compose:

```bash
docker compose logs -f webhook-worker
```

```bash
python -m app.webhooks.worker
```

O worker aceita apenas destinos HTTPS que resolvam para endereços IP públicos e não segue redirecionamentos. A execução contínua do worker deve ser configurada no ambiente onde a API for executada.

## Automações

O MVP permite criar regras em `POST /api/v1/automations`, listar em `GET /api/v1/automations`, ativar/pausar em `PATCH /api/v1/automations/{id}` e remover em `DELETE /api/v1/automations/{id}`. Cada regra observa a entrada do lead numa etapa e cria uma tarefa associada ao lead com o título, descrição e prazo configurados. A automação e a atualização do lead são persistidas na mesma transação; as tarefas geradas também emitem o evento `task.created` para os webhooks inscritos.

## Testes

Os testes automatizados usam SQLite em memória e não precisam iniciar o PostgreSQL. Na raiz do repositório, execute:

```bash
docker compose --profile test run --build --rm test
```

Também é possível instalar as dependências de teste e rodar `pytest` dentro do ambiente virtual do backend.

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
