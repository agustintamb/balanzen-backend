# Balanzen Backend

API REST para Balanzen, construida con Node.js, Express y MongoDB.

## Requisitos previos

- Node.js >= 18
- npm
- MongoDB (ver guía abajo)

## Instalación

```bash
npm install
```

## Variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env.local
```

Luego editar `.env.local` con los valores correspondientes.

## Configurar MongoDB localmente

1. Descargar e instalar [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Descargar e instalar [MongoDB Compass](https://www.mongodb.com/try/download/compass) (cliente visual)
3. Iniciar el servicio de MongoDB (se levanta automáticamente tras la instalación en Mac/Windows)
4. Abrir MongoDB Compass y conectarse con la URI:
   ```
   mongodb://localhost:27017
   ```
5. Crear una base de datos llamada `balanzen_local` (Compass la crea automáticamente al primer insert)

La variable `MONGODB_URI` en `.env.local` debe apuntar a:
```
mongodb://localhost:27017/balanzen_local
```

## Levantar en modo desarrollo

```bash
npm run dev
```

La API queda disponible en `http://localhost:3001`.

## Tests

El proyecto usa [Vitest](https://vitest.dev/) con [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server). Los tests no requieren una instancia de MongoDB corriendo.

```bash
npm run test:run   # Corre una vez (CI)
npm test           # Modo watch (desarrollo)
```

## Endpoints principales

| Ruta | Auth | Descripción |
|------|------|-------------|
| `GET /` | — | Info de la API |
| `GET /api/v1/health` | — | Health check |
| `GET /api/docs` | — | Documentación Swagger |
| `POST /api/v1/auth/register` | — | Registra CONSUMIDOR o COMERCIO |
| `POST /api/v1/auth/login` | — | Inicia sesión, retorna tokens |
| `POST /api/v1/auth/refresh` | JWT | Renueva el access token |
| `POST /api/v1/auth/logout` | JWT | Cierra sesión e invalida refresh token |
| `GET /api/v1/users/me` | JWT | Perfil completo del usuario |
| `PUT /api/v1/users/me` | JWT | Actualiza perfil del usuario |
| `GET /api/v1/addresses/search?q=` | JWT | Busca direcciones por texto (geocoding) |
| `GET /api/v1/addresses` | JWT | Lista las direcciones del usuario |
| `POST /api/v1/addresses` | JWT | Crea una nueva dirección |
| `PUT /api/v1/addresses/:id` | JWT | Actualiza una dirección propia |
| `DELETE /api/v1/addresses/:id` | JWT | Elimina una dirección (soft delete) |
| `PUT /api/v1/addresses/:id/select` | JWT | Marca una dirección como activa |
