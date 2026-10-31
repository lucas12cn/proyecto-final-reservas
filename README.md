# Reservas Deportivas · Villaguay

Trabajo Final Integrador de **Desarrollo para Móviles** (UNER, 2026). Aplicación móvil para que
la Dirección de Deportes de la Municipalidad de Villaguay gestione los turnos de sus once
espacios deportivos: ver disponibilidad, reservar, cancelar, entrar con un código QR y recibir
avisos. El pedido original está en [`api-reservas-deportivas/docs/prd.pdf`](api-reservas-deportivas/docs/prd.pdf).

> **Integrantes:** `<Nombre y apellido>`, `<Nombre y apellido>`, `<Nombre y apellido>`
> **Cátedra / año:** Desarrollo para Móviles · UNER · 2026

---

## 1. Qué hay en este repositorio

```
proyecto-final-reservas/
├── api-reservas-deportivas/   API REST (NestJS + TypeORM). La provee la cátedra; el grupo
│                              completó la parte de notificaciones push.
├── my-app/                    App móvil (React Native + Expo + Expo Router). Es el
│                              trabajo del grupo.
└── docs/                      Documentación técnica para desarrolladores (ver §7).
```

| Parte | Tecnología principal | Carpeta |
|---|---|---|
| App móvil | React Native 0.86 · Expo SDK 57 · Expo Router · TypeScript | `my-app/` |
| API | NestJS 12 · TypeORM · SQLite / PostgreSQL / MySQL / MariaDB | `api-reservas-deportivas/` |
| Avisos push | `expo-notifications` + API de push de Expo | ambas |

La app habla con la API por HTTP. En desarrollo ambas corren en la misma red wifi: la API en la
computadora y la app en el teléfono (Expo Go).

## 2. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | **24** (ver `api-reservas-deportivas/.nvmrc`) | API y app |
| pnpm | 10 (`corepack enable`) | instalar la API |
| npm | el que trae Node | instalar la app |
| Docker Desktop | opcional | levantar la API sin instalar Node |
| Teléfono + **Expo Go** | versión compatible con SDK 57 | probar la app |

La computadora y el teléfono tienen que estar **en la misma red wifi**.

## 3. Puesta en marcha

### 3.1 Levantar la API

**Opción A — Docker (un solo comando):**

```bash
cd api-reservas-deportivas
docker compose up
```

**Opción B — Node + SQLite (sin Docker):**

```bash
cd api-reservas-deportivas
pnpm install
cp .env.example .env          # en Windows: copy .env.example .env
pnpm db:reiniciar             # crea la base y carga los datos de demo
pnpm dev                      # API en http://localhost:3000
```

Verificación: abrir <http://localhost:3000/salud> (debe responder `{"datos":{"estado":"ok",…}}`)
y la documentación interactiva en <http://localhost:3000/docs>.

Al arrancar, la API imprime la IP de la computadora, por ejemplo
`Desde el teléfono (misma red wifi): http://192.168.0.10:3000/salud`. **Anotá esa IP**: la
necesitás en el paso siguiente. (Con Docker, buscala con `ipconfig` / `ifconfig`.)

> Si el teléfono no llega a la API, casi siempre es el firewall de Windows (puerto 3000) o una
> red que aísla los equipos entre sí (probá con el hotspot del teléfono).

### 3.2 Configurar la dirección de la API en la app

La app lee la dirección de la API de la variable `EXPO_PUBLIC_API_URL`. Copiá el ejemplo y
poné la IP de tu computadora (la que imprime la API al arrancar):

```bash
cd my-app
cp .env.example .env.local     # en Windows: copy .env.example .env.local
# editar .env.local →  EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
```

`.env.local` lo ignora git: cada integrante usa su propia IP. Sin ese archivo la app usa
`http://192.168.1.6:3000` (valor por defecto de `my-app/src/servicios/config.ts`). Las
variables `EXPO_PUBLIC_*` se leen al **iniciar** Expo: si cambiás la IP, reiniciá con
`npx expo start -c`.

### 3.3 Levantar la app

```bash
cd my-app
npm install
npx expo start
```

Escanear el QR que muestra Expo con **Expo Go** (Android) o con la cámara (iPhone).

### 3.4 Usuarios de demo

Todos con contraseña **`villaguay2026`** (todo en minúscula).

| Email | Rol | Sirve para probar |
|---|---|---|
| `emiliano@mail.com` | jugador | El usuario del PRD, con historial y una cancelación tardía |
| `lleno@demo.ar` | jugador | Tiene 3 reservas activas: la cuarta devuelve `LIMITE_DE_RESERVAS` |
| `nuevo@demo.ar` | jugador | Cuenta vacía |
| `marcelo@villaguay.demo.ar` | encargado | Agenda, ingresos, bloqueos |
| `nahuel@villaguay.demo.ar` | administrador | Todo, más reservas fijas y precios |

> Los campos de ingreso de la app arrancan vacíos: escribí el email y la contraseña.

## 4. Notificaciones push

Hay dos avisos que manda el servidor:

| Cuándo | A quién | Título |
|---|---|---|
| Un bloqueo del encargado cancela una reserva | Dueño de la reserva | "Reserva cancelada" |
| Alguien cancela y el turno sigue siendo futuro | Quienes tienen ese espacio como favorito (salvo quien canceló) | "Se liberó un turno" |

Para que lleguen de verdad:

1. En `api-reservas-deportivas/.env` poné `NOTIFICACIONES=expo` y reiniciá la API. Con el valor
   por defecto (`registro`) los avisos **sólo se escriben en la consola de la API**.
2. Usá un **teléfono real** (los emuladores sin Google Play no obtienen token).
3. Si `getExpoPushTokenAsync` se queja de que falta el `projectId`, ejecutá `npx eas init` dentro
   de `my-app/`.
4. Probar: iniciar sesión en la app y llamar a `POST /dispositivos/prueba` con el token de
   sesión (desde Swagger en `/docs`). Tiene que llegar "Notificación de prueba".

> ⚠️ **Android + Expo Go:** desde Expo SDK 53, Expo Go en Android no soporta notificaciones
> push remotas. En Android hace falta un *development build* (`eas build --profile development`)
> o el build de producción. En iPhone funcionan con Expo Go. Detalle en
> [`docs/05-notificaciones-push.md`](docs/05-notificaciones-push.md).

## 5. Comandos útiles

### API (`api-reservas-deportivas/`)

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Levanta la API con recarga automática |
| `pnpm db:reiniciar` | Borra la base y vuelve a cargar los datos de demo |
| `pnpm verificar` | `tsc` + lint + tests unitarios + tests e2e (lo que corre el CI) |
| `pnpm test` / `pnpm test:e2e` | Tests unitarios / de extremo a extremo |
| `pnpm test:notificaciones` | Tests de la parte de push (tokens y envío a Expo) |
| `pnpm lint` | Lint con oxlint |

### App (`my-app/`)

| Comando | Qué hace |
|---|---|
| `npx expo start` | Servidor de desarrollo (QR para Expo Go) |
| `npm run android` / `npm run ios` | Build nativo local (requiere Android Studio / Xcode) |
| `npm run lint` | Lint de Expo |
| `npx tsc --noEmit` | Chequeo de tipos |

## 6. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| La app muestra listas vacías o "Sin conexión a internet o red local" | `EXPO_PUBLIC_API_URL` (`.env.local`) no es la IP de tu computadora, no reiniciaste Expo con `-c`, la API está apagada o están en redes wifi distintas |
| `El email o la contraseña no son correctos.` con `emiliano@mail.com` | La contraseña correcta es `villaguay2026` (todo en minúscula) |
| `NO_AUTENTICADO` después de `pnpm db:reiniciar` | El usuario se borró y se recreó: cerrar sesión e ingresar de nuevo |
| `EADDRINUSE :::3000` | Ya hay una API corriendo en el puerto 3000 |
| `Could not locate the bindings file` (better-sqlite3) | Repetir `pnpm install` con Node 24, o usar Docker |
| No llegan las push | `NOTIFICACIONES=expo`, teléfono real, permiso concedido y, en Android, development build |
| El mapa queda en blanco | Necesita internet: carga Leaflet desde `unpkg.com` y los mosaicos de OpenStreetMap |
| `pnpm install --frozen-lockfile` falla | `pnpm-lock.yaml` desincronizado: correr `pnpm install` y commitear el lockfile |

## 7. Documentación para desarrolladores

Pensada para que cualquier integrante pueda explicar el proyecto completo (planificación,
diseño, implementación y código):

| Documento | Contenido |
|---|---|
| [`docs/00-indice.md`](docs/00-indice.md) | Índice, glosario y cómo leer la documentación |
| [`docs/01-planificacion-y-requerimientos.md`](docs/01-planificacion-y-requerimientos.md) | Contexto, alcance, requisitos, decisiones de diseño, trazabilidad PRD → implementación |
| [`docs/02-arquitectura.md`](docs/02-arquitectura.md) | Arquitectura, stack, flujos de datos, estrategia offline |
| [`docs/03-api-backend.md`](docs/03-api-backend.md) | La API: módulos, reglas de negocio, concurrencia, errores, pruebas |
| [`docs/04-app-movil.md`](docs/04-app-movil.md) | La app: navegación, pantallas, estado, servicios, código por archivo |
| [`docs/05-notificaciones-push.md`](docs/05-notificaciones-push.md) | Diseño e implementación de las notificaciones push |
| [`docs/06-modelo-de-datos-y-contrato.md`](docs/06-modelo-de-datos-y-contrato.md) | Tipos, tablas, identificadores y endpoints |
| [`docs/07-pruebas-y-calidad.md`](docs/07-pruebas-y-calidad.md) | Estrategia de pruebas, CI y plan de pruebas manuales |
| [`docs/08-estado-actual-y-deuda-tecnica.md`](docs/08-estado-actual-y-deuda-tecnica.md) | Qué falta respecto del PRD, errores conocidos y mejoras |
| [`docs/09-guia-de-defensa.md`](docs/09-guia-de-defensa.md) | Guion para la defensa oral y preguntas probables |

La API trae además su propia documentación en `api-reservas-deportivas/` (`README.md`,
`AGENTS.md`, `docs/SPECIFICATION.md`, `docs/DECISIONS.md`, `docs/NOTIFICATIONS.md`).

## 8. Licencia y autoría

Trabajo académico. La API y el PRD fueron provistos por la cátedra; la aplicación móvil y la
integración de notificaciones push son del grupo.
