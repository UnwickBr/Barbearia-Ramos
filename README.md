# Barbearia Ramos

Site institucional com autenticacao exclusiva via Google e reservas persistidas no NeonDB, pronto para deploy na Vercel.

## Stack

- React + Vite + TypeScript
- Vercel Functions
- Neon Postgres
- Google Identity Services
- Google Calendar API
- Gmail API

## Variaveis de ambiente

Crie um `.env` local a partir de `.env.example`.

```bash
DATABASE_URL="postgres://..."
SESSION_SECRET="um-segredo-longo-e-aleatorio"
GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
VITE_GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
ADMIN_EMAILS="fariavictor2011@gmail.com"
```

## Banco de dados

O schema base esta em `neon/schema.sql`.

As tabelas sao criadas automaticamente pelas funcoes da API no primeiro uso:

- `users`
- `reservations`

As reservas guardam tambem:

- `google_calendar_event_id`
- `google_calendar_event_link`
- `cancelled_at`

## Rodando localmente

Para frontend apenas:

```bash
npm install
npm run dev
```

Para frontend + funcoes `/api`:

```bash
npm install
npm run dev:full
```

## Scripts uteis

```bash
npm run build
npm run lint
npm run typecheck:api
npm test
```

## Endpoints

- `POST /api/auth/google`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/reservations`
- `POST /api/reservations`
- `PATCH /api/reservations/:id`
- `DELETE /api/reservations/:id`
- `GET /api/admin/reservations`

## Deploy

Na Vercel, configure as variaveis `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID` e `VITE_GOOGLE_CLIENT_ID` no projeto antes do deploy.

Para a sincronizacao com Google Calendar e Gmail funcionar em producao, habilite no Google Cloud:

- `Google Calendar API`
- `Gmail API`

Se a tela de consentimento OAuth estiver em modo de teste, adicione seu proprio e-mail como usuario de teste.
