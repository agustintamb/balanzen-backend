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

## Seed de datos de prueba

Limpia la base de datos y carga un dataset completo: 20 usuarios, 52 publicaciones, 20 órdenes, 72 mensajes, 52 notificaciones y 39 favoritos.

```bash
npm run seed
```

**Credenciales del seed:**

| Nombre / Comercio                         | Email                    | Contraseña | Rol        | Dirección    |
| ----------------------------------------- | ------------------------ | ---------- | ---------- | ------------ |
| Admin BalanZen                            | admin@balanzen.com       | Admin123   | ADMIN      | —            |
| Panadería El Hornito                      | facundo@elhornito.com    | Test1234   | COMERCIO   | 3 dirs       |
| Frutería y Verdulería La Esquina de Ernesto | ernesto@verduleria.com | Test1234   | COMERCIO   | 3 dirs       |
| Almacén La Despensa de Rosi               | rosi@ladespensa.com      | Test1234   | COMERCIO   | 3 dirs       |
| Carnicería San José                       | pedro@carniceria.com     | Test1234   | COMERCIO   | 2 dirs       |
| Mercado Todo                              | marta@mercadotodo.com    | Test1234   | COMERCIO   | 2 dirs       |
| Pizzería Rey                              | carlos@pizzeriarey.com   | Test1234   | COMERCIO   | 2 dirs       |
| La Cervecería Artesanal                   | lucia@lacerveceria.com   | Test1234   | COMERCIO   | sin dirección |
| Valentina Suárez                          | valentina@mail.com       | Test1234   | CONSUMIDOR | 4 dirs       |
| Gonzalo López                             | gonzalo@mail.com         | Test1234   | CONSUMIDOR | 4 dirs       |
| Sofía Romero                              | sofia@mail.com           | Test1234   | CONSUMIDOR | 3 dirs       |
| Diego Hernández                           | diego@mail.com           | Test1234   | CONSUMIDOR | 3 dirs       |
| Natalia Ferreyra                          | natalia@mail.com         | Test1234   | CONSUMIDOR | 3 dirs       |
| Lucas Medina                              | lucas@mail.com           | Test1234   | CONSUMIDOR | 2 dirs       |
| Ana Gómez                                 | ana@mail.com             | Test1234   | CONSUMIDOR | 2 dirs       |
| Julián Castro                             | julian@mail.com          | Test1234   | CONSUMIDOR | 2 dirs       |
| Paula Vargas                              | paula@mail.com           | Test1234   | CONSUMIDOR | 2 dirs       |
| Roberto Silva                             | roberto@mail.com         | Test1234   | CONSUMIDOR | 2 dirs       |
| Camila Torres                             | camila@mail.com          | Test1234   | CONSUMIDOR | sin dirección |
| Martín Gimenez                            | martin@mail.com          | Test1234   | CONSUMIDOR | sin dirección |

## Tests

El proyecto usa [Vitest](https://vitest.dev/) con [mongodb-memory-server](https://github.com/nodkz/mongodb-memory-server). Los tests no requieren una instancia de MongoDB corriendo.

```bash
npm run test:run   # Corre una vez (CI)
npm test           # Modo watch (desarrollo)
```

## Documentación Swagger

Con el servidor corriendo, la documentación interactiva está disponible en:

```
http://localhost:3001/api/docs
```

## WebSocket

El servidor expone un endpoint de WebSocket en `/ws`. Los clientes deben autenticarse enviando el evento `authenticate` con el JWT tras conectarse.

**Eventos del cliente → servidor:**

| Evento         | Payload        | Descripción                 |
| -------------- | -------------- | --------------------------- |
| `authenticate` | `{ token }`    | Autentica la conexión       |
| `join_chat`    | `{ order_id }` | Se une a la sala del chat   |
| `leave_chat`   | `{ order_id }` | Abandona la sala            |
| `typing`       | `{ order_id }` | Indica que está escribiendo |

**Eventos del servidor → cliente:**

| Evento             | Descripción                     |
| ------------------ | ------------------------------- |
| `new_message`      | Nuevo mensaje en un chat activo |
| `user_typing`      | Un usuario está escribiendo     |
| `user_online`      | Estado de conexión              |
| `new_notification` | Nueva notificación persistente  |

## Cron Jobs

El servidor ejecuta dos jobs horarios automáticamente:

- **Publicaciones vencidas:** cambia a `EXPIRED` las publicaciones `ACTIVE` cuya fecha de vencimiento ya pasó y notifica al comercio.
- **Publicaciones por vencer:** envía una notificación al comercio cuando una publicación `ACTIVE` vence en menos de 24 horas (sin duplicar si ya se notificó).

## Endpoints

### Auth

| Método | Ruta                    | Auth | Descripción                            |
| ------ | ----------------------- | ---- | -------------------------------------- |
| POST   | `/api/v1/auth/register` | —    | Registra CONSUMIDOR o COMERCIO         |
| POST   | `/api/v1/auth/login`    | —    | Inicia sesión, retorna tokens          |
| POST   | `/api/v1/auth/refresh`  | JWT  | Renueva el access token                |
| POST   | `/api/v1/auth/logout`   | JWT  | Cierra sesión e invalida refresh token |

### Users

| Método | Ruta               | Auth | Descripción                             |
| ------ | ------------------ | ---- | --------------------------------------- |
| GET    | `/api/v1/users/me` | JWT  | Perfil completo del usuario autenticado |
| PUT    | `/api/v1/users/me` | JWT  | Actualiza perfil (campos según rol)     |

### Addresses

| Método | Ruta                           | Auth | Descripción                             |
| ------ | ------------------------------ | ---- | --------------------------------------- |
| GET    | `/api/v1/addresses/search?q=`  | JWT  | Busca direcciones por texto (geocoding) |
| GET    | `/api/v1/addresses`            | JWT  | Lista las direcciones del usuario       |
| POST   | `/api/v1/addresses`            | JWT  | Crea una nueva dirección                |
| PUT    | `/api/v1/addresses/:id`        | JWT  | Actualiza una dirección propia          |
| DELETE | `/api/v1/addresses/:id`        | JWT  | Elimina una dirección (soft delete)     |
| PUT    | `/api/v1/addresses/:id/select` | JWT  | Marca una dirección como activa         |

### Categories

| Método | Ruta                 | Auth | Descripción              |
| ------ | -------------------- | ---- | ------------------------ |
| GET    | `/api/v1/categories` | JWT  | Lista categorías activas |

### Uploads

| Método | Ruta                    | Auth | Descripción                              |
| ------ | ----------------------- | ---- | ---------------------------------------- |
| POST   | `/api/v1/uploads/image` | JWT  | Sube una imagen a Cloudinary (multipart) |
| DELETE | `/api/v1/uploads/image` | JWT  | Elimina una imagen de Cloudinary por URL |

### Publications

| Método | Ruta                       | Auth | Rol        | Descripción                             |
| ------ | -------------------------- | ---- | ---------- | --------------------------------------- |
| POST   | `/api/v1/publications`     | JWT  | COMERCIO   | Crea una publicación                                              |
| GET    | `/api/v1/publications`     | JWT  | CONSUMIDOR | Lista publicaciones activas con filtros                          |
| GET    | `/api/v1/publications/me`  | JWT  | COMERCIO   | Mis publicaciones (todos los estados). Incluye `unread_count`.   |
| GET    | `/api/v1/publications/:id` | JWT  | —          | Detalle de una publicación                                        |
| PUT    | `/api/v1/publications/:id` | JWT  | COMERCIO   | Edita una publicación (solo si ACTIVE)                            |
| DELETE | `/api/v1/publications/:id` | JWT  | COMERCIO   | Da de baja (ACTIVE → CANCELLED)                                   |

**Filtros de `GET /publications`:** `category_id`, `min_discount`, `max_price`, `donation`, `search`, `sort_by` (created_at, discount_pct, expiry_date, final_price, distance), `sort_order`, `lat`, `lng`, `radius_km`, `page`, `limit`.

**Filtros de `GET /publications/me`:** `status`, `date_from`, `date_to` (ISO 8601), `page`, `limit`.

### Orders

| Método | Ruta                         | Auth | Rol        | Descripción                                              |
| ------ | ---------------------------- | ---- | ---------- | -------------------------------------------------------- |
| POST   | `/api/v1/orders`             | JWT  | CONSUMIDOR | Crea una reserva                                         |
| GET    | `/api/v1/orders`             | JWT  | —          | Lista pedidos del usuario autenticado. Incluye `unread_count`. |
| GET    | `/api/v1/orders/:id`         | JWT  | —          | Detalle de un pedido                                     |
| PUT    | `/api/v1/orders/:id/cancel`  | JWT  | —          | Cancela un pedido (ambas partes)                         |
| PUT    | `/api/v1/orders/:id/deliver` | JWT  | COMERCIO   | Marca un pedido como entregado                           |

**Filtros de `GET /orders`:** `status` (RESERVED, DELIVERED, CANCELLED), `date_from`, `date_to` (ISO 8601), `page`, `limit`.

### Chat

| Método | Ruta                              | Auth | Descripción                                                        |
| ------ | --------------------------------- | ---- | ------------------------------------------------------------------ |
| GET    | `/api/v1/chats`                   | JWT  | Lista conversaciones del usuario. Incluye `unread_count` por chat. |
| GET    | `/api/v1/chats/:orderId/messages` | JWT  | Mensajes de un chat (paginados). Marca el chat como leído.         |
| POST   | `/api/v1/chats/:orderId/messages` | JWT  | Envía un mensaje (orden debe estar RESERVED).                      |

> `unread_count` cuenta mensajes del otro participante no leídos. Se resetea automáticamente al llamar a `GET /chats/:orderId/messages` o al enviar un mensaje.

### Notifications

| Método | Ruta                    | Auth | Descripción                             |
| ------ | ----------------------- | ---- | --------------------------------------- |
| GET    | `/api/v1/notifications` | JWT  | Lista notificaciones con `unread_count` |

**Filtros de `GET /notifications`:** `read` (true/false), `page`, `limit`.

### Admin

| Método | Ruta                           | Auth | Rol   | Descripción                          |
| ------ | ------------------------------ | ---- | ----- | ------------------------------------ |
| POST   | `/api/v1/admin/categories`     | JWT  | ADMIN | Crea una categoría                   |
| PUT    | `/api/v1/admin/categories/:id` | JWT  | ADMIN | Edita una categoría                  |
| DELETE | `/api/v1/admin/categories/:id` | JWT  | ADMIN | Elimina una categoría (soft delete)  |
| GET    | `/api/v1/admin/publications`   | JWT  | ADMIN | Lista todas las publicaciones        |
| GET    | `/api/v1/admin/orders`         | JWT  | ADMIN | Lista todas las órdenes              |
| GET    | `/api/v1/admin/users/:id`      | JWT  | ADMIN | Perfil completo de cualquier usuario |

## Scripts

```bash
npm run dev          # Desarrollo con nodemon
npm run start:local  # Local sin nodemon
npm run lint         # Verificar estilo
npm run lint:fix     # Corregir estilo automáticamente
npm run format       # Formatear con prettier
npm test             # Tests en modo watch
npm run test:run     # Tests una vez (CI)
npm run seed         # Cargar datos de prueba
```
