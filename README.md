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
└── docs/                      Documentación técnica para desarrolladores (ver §8).
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
| `marcelo@villaguay.demo.ar` | encargado | Escáner de ingresos y **Agenda del día** (menú ☰: ver reservas, contacto y marcar ausentes) |
| `nahuel@villaguay.demo.ar` | administrador | Todo, más reservas fijas y precios |

> Los campos de ingreso de la app arrancan vacíos: escribí el email y la contraseña.

## 4. Notificaciones push

Hay dos avisos que manda el servidor:

| Cuándo | A quién | Título |
|---|---|---|
| Un bloqueo del encargado cancela una reserva | Dueño de la reserva | "Reserva cancelada" |
| Alguien cancela y el turno sigue siendo futuro | Quienes tienen ese espacio como favorito (salvo quien canceló) | "Se liberó un turno" |

Además, la app programa en el propio teléfono un **recordatorio local** ("Tu turno es en 2
horas") al reservar. No necesita servidor ni conexión y funciona también en Expo Go.

Para que lleguen las notificaciones del servidor:

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

## 5. Generar la app con EAS (builds)

La configuración ya está en `my-app/app.json` y `my-app/eas.json`.

| Perfil | Qué genera | Para qué | URL de la API |
|---|---|---|---|
| `development` | APK con *development client* | Probar con Metro y **recibir push en Android** | La de tu `.env.local` (la sirve Metro) |
| `preview` | APK instalable | Probar una versión "real" en teléfonos del grupo | `env` de `eas.json` |
| `production` | AAB (Android) / IPA (iOS) | Entrega y tiendas | `env` de `eas.json` |

### 5.1 Una sola vez

```bash
cd my-app
npm install                    # trae expo-dev-client (agregado a package.json)
npm install -g eas-cli         # o usar: npx eas-cli <comando>
eas login                      # cuenta de expo.dev (gratis)
eas init                       # crea el proyecto y agrega extra.eas.projectId a app.json (commitear)
```

Después, en `my-app/eas.json`, reemplazá `https://REEMPLAZAR-POR-LA-URL-DE-LA-API` por la URL
pública de la API (por ejemplo la de Render) en los perfiles `preview` y `production`.

> **Tiene que ser `https://`.** Los builds de producción de Android e iOS bloquean el tráfico
> `http://` sin cifrar. Un build apuntando a `http://192.168.x.x:3000` no va a poder hablar con
> la API (esto sólo funciona en Expo Go y en el development client).

### 5.2 Generar los builds

```bash
eas build --platform android --profile development   # luego: npx expo start --dev-client
eas build --platform android --profile preview       # APK: EAS entrega un enlace/QR de descarga
eas build --platform android --profile production    # AAB para Google Play
eas build --platform ios --profile production        # requiere cuenta de Apple Developer (paga)
```

### 5.3 Notificaciones push en un build

Además del `NOTIFICACIONES=expo` de la API, cada plataforma necesita credenciales:

| Plataforma | Qué hace falta |
|---|---|
| Android | (1) Crear un proyecto en Firebase con una app Android cuyo nombre de paquete sea **`com.villaguay.reservasdeportivas`**; (2) descargar `google-services.json`, ponerlo en `my-app/` y agregar `"googleServicesFile": "./google-services.json"` dentro de `android` en `app.json`; (3) subir a EAS la *clave de cuenta de servicio FCM V1* con `eas credentials` (Android → Google Service Account) |
| iOS | Subir una *APNs key* a EAS (necesita cuenta de Apple Developer) |

La clave de cuenta de servicio es secreta: **no se commitea**.

### 5.4 Mapa: clave de Google Maps (sólo Android)

El mapa usa `react-native-maps`: en Android dibuja **Google Maps** y en iPhone **Apple Maps** (sin
clave). En Expo Go no hace falta configurar nada. En un **build de Android** hace falta una clave:

1. En Google Cloud, crear un proyecto y habilitar **Maps SDK for Android**.
2. Crear una *API key* y restringirla a apps Android con el paquete
   `com.villaguay.reservasdeportivas` y el SHA-1 del certificado de firma (aparece en
   *Credentials* del proyecto en expo.dev, después del primer build).
3. Cargarla como variable de entorno **`GOOGLE_MAPS_API_KEY`** de EAS (dashboard de expo.dev →
   *Environment variables*, o `eas env:create`; ver la documentación de variables de EAS para los
   entornos `preview` y `production`).

`my-app/app.config.js` lee esa variable y la agrega al manifiesto de Android; sin la variable no
agrega nada y el mapa **no se dibuja** en los builds de Android. La clave no se escribe en el
repositorio.

### 5.5 Identidad de la app

| Dato | Valor | Dónde |
|---|---|---|
| Nombre visible | Deportes Villaguay | `app.json` → `name` |
| Identificador Android / iOS | `com.villaguay.reservasdeportivas` | `android.package`, `ios.bundleIdentifier` |
| Esquema de enlaces | `reservasvillaguay` | `scheme` |

> **El identificador no se puede cambiar una vez publicada la app en Google Play.** Si prefieren
> otro (por ejemplo con el dominio de la facultad), cámbienlo en `app.json` **antes** del primer
> build de producción.

Los permisos (cámara, ubicación, galería, Face ID) tienen mensajes en castellano y se piden sólo
los necesarios (sin micrófono ni ubicación en segundo plano). Los íconos y la pantalla de inicio
siguen siendo los de la plantilla de Expo: reemplazá `assets/images/icon.png`,
`android-icon-*.png`, `splash-icon.png` y `favicon.png` por los del proyecto.

## 6. Comandos útiles

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
| `npx expo config --type introspect` | Muestra permisos y `Info.plist`/manifiesto resultantes (sirve para revisar `app.json`) |
| `npm run lint` | Lint de Expo |
| `npx tsc --noEmit` | Chequeo de tipos |

## 7. Problemas frecuentes

| Síntoma | Causa probable y solución |
|---|---|
| La app muestra listas vacías o "Sin conexión a internet o red local" | `EXPO_PUBLIC_API_URL` (`.env.local`) no es la IP de tu computadora, no reiniciaste Expo con `-c`, la API está apagada o están en redes wifi distintas |
| `El email o la contraseña no son correctos.` con `emiliano@mail.com` | La contraseña correcta es `villaguay2026` (todo en minúscula) |
| `NO_AUTENTICADO` después de `pnpm db:reiniciar` | El usuario se borró y se recreó: cerrar sesión e ingresar de nuevo |
| `EADDRINUSE :::3000` | Ya hay una API corriendo en el puerto 3000 |
| La API no arranca: `Falta JWT_SECRETO` | No hay archivo `.env`: copiá `.env.example` a `.env` (también activa `SEMBRAR_SI_VACIA`, que carga los datos de demo) |
| `Could not locate the bindings file` (better-sqlite3) | Repetir `pnpm install` con Node 24, o usar Docker |
| No llegan las push | `NOTIFICACIONES=expo`, teléfono real, permiso concedido y, en Android, development build |
| El mapa no se dibuja | En Expo Go: revisá la conexión y el permiso de ubicación. En un **build de Android**: falta la clave `GOOGLE_MAPS_API_KEY` (ver §5.4) |
| El build de `preview`/`production` no se conecta a la API | La URL de `eas.json` debe ser `https://` y apuntar a la API publicada |
| `pnpm install --frozen-lockfile` falla | `pnpm-lock.yaml` desincronizado: correr `pnpm install` y commitear el lockfile |

## 8. Documentación para desarrolladores

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

## 9. Licencia y autoría

Trabajo académico. La API y el PRD fueron provistos por la cátedra; la aplicación móvil y la
integración de notificaciones push son del grupo.
