# Barbearia Ramos

Site institucional com autenticação e reservas persistidas no NeonDB, pronto para deploy na Vercel.

## Stack

- React + Vite + TypeScript
- Vercel Functions
- Neon Postgres

## Variáveis de ambiente

Crie um `.env` local a partir de `.env.example`.

```bash
DATABASE_URL="postgres://..."
SESSION_SECRET="um-segredo-longo-e-aleatorio"
```

## Banco de dados

O schema base está em `neon/schema.sql`.

As tabelas também são criadas automaticamente pelas funções da API no primeiro uso:

- `users`
- `reservations`

## Rodando localmente

Para frontend apenas:

```bash
npm install
npm run dev
```

Para frontend + funções `/api`:

```bash
npm install
npm run dev:full
```

## Scripts úteis

```bash
npm run build
npm run lint
npm run typecheck:api
npm test
```

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/reservations`
- `POST /api/reservations`

## Deploy

Na Vercel, configure as variáveis `DATABASE_URL` e `SESSION_SECRET` no projeto antes do próximo deploy.
