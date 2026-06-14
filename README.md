# BalanZen Backend

API REST de **BalanZen** — marketplace que conecta comercios con consumidores para vender productos próximos a vencer o en liquidación. Construida con **Node.js + Express + MongoDB**.

> Este README es la puerta de entrada: lo necesario para **clonar, configurar y arrancar**. La arquitectura, las convenciones de código, el contrato de la API y las guías de testing/demo viven en [`docs/`](#documentación) — ver índice al final.

## Stack

- **Runtime:** Node.js ≥ 18 con ES Modules (`"type": "module"`)
- **Framework:** Express 4 · **DB:** MongoDB + Mongoose 8
- **Auth:** JWT + bcryptjs · **Imágenes:** Cloudinary + multer
- **Geocoding:** Nominatim (OpenStreetMap, público — sin API key)
- **WebSockets:** socket.io · **Jobs:** node-cron
- **Docs API:** Swagger en `/api/docs` · **Tests:** Vitest + mongodb-memory-server
- **Calidad:** ESLint + Prettier · SonarCloud

## Requisitos previos

- Node.js ≥ 18 y npm
- MongoDB (local o Atlas) — ver [Configurar MongoDB](#configurar-mongodb-localmente)

## Instalación

```bash
npm install
```

## Variables de entorno

La config se carga según `NODE_ENV` desde `.env.{local|testing|production}` y se centraliza en [`src/config/env.config.js`](src/config/env.config.js) (ningún otro archivo lee `process.env`). Copiá el ejemplo y completá los valores:

```bash
cp .env.example .env.local
```

| Variable | Requerida | Descripción |
|----------|:---------:|-------------|
| `NODE_ENV` | — | `local` / `testing` / `production` (default `local`) |
| `PORT` | — | Puerto HTTP (default `3001`) |
| `BASE_URL` | — | URL base para logs/links (default `http://localhost:3001`) |
| `MONGODB_URI` | ✅ | URI de conexión a MongoDB (ej. `mongodb://localhost:27017/balanzen_local`) |
| `JWT_SECRET` | ✅ | Secreto para firmar el access token |
| `JWT_REFRESH_SECRET` | ✅ | Secreto para firmar el refresh token |
| `JWT_EXPIRES_IN` | — | Vida del access token (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | — | Vida del refresh token (default `7d`) |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloud name de Cloudinary (subida de imágenes) |
| `CLOUDINARY_API_KEY` | ✅ | API key de Cloudinary |
| `CLOUDINARY_API_SECRET` | ✅ | API secret de Cloudinary |
| `ALLOWED_ORIGINS` | — | Origins permitidos por CORS, separados por coma |

> El geocoding usa la API pública de Nominatim y **no requiere variable de entorno**.

## Configurar MongoDB localmente

1. Instalar [MongoDB Community Server](https://www.mongodb.com/try/download/community) (y opcionalmente [Compass](https://www.mongodb.com/try/download/compass) como cliente visual).
2. Iniciar el servicio de MongoDB (se levanta automáticamente tras instalar en Mac/Windows).
3. Apuntar `MONGODB_URI` en `.env.local` a `mongodb://localhost:27017/balanzen_local` (la DB se crea sola al primer insert).

## Levantar la API

```bash
npm run dev          # desarrollo con nodemon (NODE_ENV=local)
```

La API queda en `http://localhost:3001`. Health check: `GET /api/v1/health`.

## Seed de datos de prueba

Limpia la base y carga un dataset completo (usuarios, categorías, publicaciones, órdenes, mensajes, notificaciones y favoritos):

```bash
npm run seed         # carga datos de prueba (NODE_ENV=local)
npm run db:reset     # resetea la base local
```

**Credenciales del seed:**

- **Admin:** `admin@balanzen.com` / `Admin123`
- **Resto de los usuarios** (comercios y consumidores): contraseña `Test1234`

> Los emails de cada usuario y su rol/direcciones se definen en [`src/assets/scripts/seed.js`](src/assets/scripts/seed.js).

## Tests

[Vitest](https://vitest.dev/) + [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server). **No requieren** una instancia de MongoDB corriendo.

```bash
npm test             # modo watch (desarrollo)
npm run test:run     # corre una vez (CI)
```

Cómo se escriben los tests, fixtures y mocks: [docs/TESTING.md](docs/TESTING.md).

## Documentación interactiva (Swagger)

Con el servidor corriendo: **http://localhost:3001/api/docs**

## Scripts de `package.json`

| Script | Qué hace |
|--------|----------|
| `npm run dev` | Desarrollo con nodemon (`NODE_ENV=local`) |
| `npm run start:local` / `start:testing` / `start:prod` | Arranque sin nodemon por ambiente |
| `npm run lint` / `lint:fix` | Verifica / corrige estilo (ESLint + Prettier) |
| `npm run format` | Formatea con Prettier |
| `npm test` / `npm run test:run` | Tests en watch / una vez |
| `npm run seed` / `db:reset` | Carga datos de prueba / resetea la DB local |

## Documentación

| Doc | Contenido |
|-----|-----------|
| [docs/API.md](docs/API.md) | Contrato completo de endpoints + modelos de datos |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Flujo de request, capas y reglas de dependencia |
| [docs/SERVICES.md](docs/SERVICES.md) | Patrón de service (lógica de negocio, errores, side-effects) |
| [docs/CONTROLLERS_ROUTES.md](docs/CONTROLLERS_ROUTES.md) | Controllers, rutas, middlewares y Swagger |
| [docs/MODELS.md](docs/MODELS.md) | Convenciones de schemas Mongoose y soft delete |
| [docs/ERROR_HANDLING.md](docs/ERROR_HANDLING.md) | Errores, handler global y mapa de códigos HTTP |
| [docs/TESTING.md](docs/TESTING.md) | Tests automatizados con Vitest |
| [docs/SONARQUBE.md](docs/SONARQUBE.md) | Quality Gate, reglas y checklist de cierre |
| [docs/TESTING_GUIDE.md](docs/TESTING_GUIDE.md) · [docs/SWAGGER_DEMO_GUIDE.md](docs/SWAGGER_DEMO_GUIDE.md) | Pruebas manuales y demo con Swagger |
| [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) · [docs/TEAMMATES_GUIDE.md](docs/TEAMMATES_GUIDE.md) | Plan de fases y reparto de paquetes |

> Las WebSocket (`/ws`), los cron jobs y las reglas de negocio están documentados en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y [docs/API.md](docs/API.md).
