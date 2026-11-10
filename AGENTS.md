# AGENTS.md — Trabajo Final Integrador 2026

**Repositorio:** `/home/mariano/proyecto-final-reservas`

Vale para los dos proyectos principales que conforman el trabajo final:
- **API** (`api-reservas-deportivas/`) — NestJS + TypeORM, ver su AGENTS.md para reglas específicas.
- **App** (`my-app/`) — React Native + Expo, ver su package.json y README para comandos.

---

## 0. Estructura general

```
.
├── AGENTS.md              ← este archivo (reglas transversales)
├── CLAUDE.md              ← importa AGENTS.md
├── README.md              ← visión general (para alumnos)
├── PENDIENTES.md
├── api-reservas-deportivas/   ← API NestJS (tiene su propio AGENTS.md detallado)
│   ├── contract/            ← tipos y contrato del PRD
│   ├── docs/                ← SPECIFICATION.md, DECISIONS.md
│   └── src/                 ← código fuente
└── my-app/                ← App React Native (Expo + TypeScript)
    ├── src/
    ├── App.tsx
    └── package.json
```

### Documentos clave y precedencia

| Documento | Qué tiene | Sirve para |
|---|---|---|
| `api-reservas-deportivas/AGENTS.md` | Reglas específicas de la API (contrato, DB, tests, etc.) | Consultar primero para dudas de la API |
| `api-reservas-deportivas/docs/SPECIFICATION.md` | Endpoints, módulos, reglas de negocio de la API | Contrato y plan de módulos |
| `api-reservas-deportivas/docs/DECISIONS.md` | Huecos del PRD y decisiones tomadas | Consultar siempre antes de implementar |
| `api-reservas-deportivas/contract/types.ts` | Tipos copiados del PRD (no tocar) | Tipos de dato |
| `my-app/README.md` | Instrucciones para alumnos (Docker, usuarios, endpoints) | Guía de desarrollo móvil |
| `docs/` (raíz) | Índice y documentación técnica transversal | Contexto general |

**Regla:** Si `api-reservas-deportivas/AGENTS.md` y `SPECIFICATION.md` contradicen, gana `SPECIFICATION.md`. Si cualquiera contradice la forma de datos del PRD (`docs/prd.pdf`), frená y preguntá.

---

## 1. Comandos transversales (raíz)

Estos comandos funcionan en la raíz; para detalles de cada paquete, entrar en su carpeta.

| Comando | Qué hace |
|---|---|
| `pnpm --filter api-reservas-deportivas verify` | Corre `verificar` solo de la API (types + lint + unit + e2e SQLite) |
| `pnpm --filter my-app lint` | Corre `expo lint` de la app |
| `pnpm --filter my-app start` | `expo start` para la app móvil |
| `pnpm --filter api-reservas-deportivas dev` | `nest start` de la API |
| `docker compose -f api-reservas-deportivas/compose.yaml up` | Levanta la API + SQLite con datos de demo (necesita Docker) |

**Orden importándo cuándo:** Si levantás la API y la app, la app debe conectar a la dirección IP de la computadora (no `localhost`, ver `my-app/README.md` §4).

---

## 2. Flujo de trabajo típico

1. **Elegí qué trabajar:** la API o la app. Por lo general se trabaja sobre la API (M0, M1, … módulos) y la app la consumen.
2. **Leé la documentación específica:**
   - Para la API: `api-reservas-deportivas/AGENTS.md` y `SPECIFICATION.md`.
   - Para la app: `my-app/README.md` y `docs/04-app-movil.md`.
3. **Ejecutá los tests correspondientes:**
   - API: `pnpm --filter api-reservas-deportivas test` o `test:e2e`.
   - App: `pnpm --filter my-app test` (Jest).
4. **Verificá que todo esté verde** antes de commit.
5. **Commit chicos** en `main`, mensaje en castellano Conventional Commits si es posible.

**Nunca:**
- Hacer `git push` o abrir PR sin que te lo pidan.
- Tocar `contract/types.ts` de la API ni agregar campos a los tipos del PRD.
- Usar `new Date()` o `Date.now()` sin ir a `src/common/reloj/` de la API (aunque esa carpeta está en la API, no en la app).
- Agregar dependencias sin decir para qué.

---

## 3. variables de entorno y configuración

### API (`api-reservas-deportivas/`)

La API usa `@nestjs/config`. Variables comunes (ver `.env.example` en la carpeta de la API):

- `PUERTO` / `PORT` — Puerto de escucha (default 3000).
- `DB_MOTOR` — `better-sqlite3` (default), `postgres`, `mysql`, `mariadb`.
- `DB_URL` / `DB_ARCHIVO` — Cadena de conexión por motor.
- `JWT_SECRETO` — Obligatorio; la app no arranca sin él.
- `SIMULACION_HABILITADA` — Si `true`, la cabecera `X-Simular: error-500`/`demora-3000` funciona.
- `RELOJ_FIJO` — Instante ISO para congelar el reloj ("hoy").

### App (`my-app/`)

- `EXPO_PUBLIC_API_BASE_URL` — URL base de la API (usar IP en red local, no `localhost`).
- Tener la misma versión de Node/yarn/pnpm que pide cada `package.json`.

---

## 4. Problemas frecuentes que un agente podría miss

| Señal | Causa probable | Solución |
|---|---|---|
| API no arranca, dice "configuración tiene problemas" | Falta `.env` o variable obligatoria | Copiar `.env.example` a `.env` en la API |
| `better-sqlite3` no se compila | Node wrong version o pnpm sin built-in debinaries | Usar Node 24 (`nvm use 24`) y `pnpm install` |
| App no se conecta a la API | Usando `localhost` en el teléfono | Usar IP de la computadora en la misma wifi (`192.168.x.x`) |
| `EADDRINUSE` en puerto 3000 | Otro proceso en el puerto | Cambiar `PUERTO` en `.env` de la API |
| `X-Simular` no hace nada | `SIMULACION_HABILITADA` no es `true` | Poner `SIMULACION_HABILITADA=true` en `.env` de la API |
| Test e2e falla por "conexión a base" | Base no levantada | `pnpm --filter api-reservas-deportivas db:reiniciar` |

---

## 5. Referencias cruzadas importantes

- **API detallada:** `api-reservas-deportivas/AGENTS.md` tiene las reglas completas sobre contrato, DB, tests, endpoints, errores, etc. Este archivo es un resumen transversal.
- **App móvil:** `my-app/README.md` tiene la guía para alumnos (Docker, usuarios, endpoints, simulación).
- **Docs transversales:** `docs/` (raíz) tiene índice y documentación general del trabajo final.
- **CI:** No hay flujo CI en la raíz. Cada paquete tiene sus propios scripts (`verificar`, `test`, `lint`, etc.).
- **OpenCode:** Las herramientas Context7 están configuradas en la cuenta de sesión, no en el repo. No agregar `.mcp.json`.

---

## 6. Cuándo consultar el AGENTS.md de cada proyecto

| Dudas sobre... | Consultar en... |
|---|---|
| Tipos, contrato, endpoints, códigos de error de la API | `api-reservas-deportivas/AGENTS.md` §2-§4 |
| Base de datos, motores, migraciones, esquema | `api-reservas-deportivas/AGENTS.md` §5 |
| Tests unitarios y e2e de la API | `api-reservas-deportivas/AGENTS.md` §10 |
| Archivos, almacenamiento S3, presets | `api-reservas-deportivas/AGENTS.md` §17 |
| Notificaciones push (lo que hace la API vs lo que programan los alumnos) | `api-reservas-deportivas/AGENTS.md` §19 |
| Comandos Docker, compose, motores de BD | `api-reservas-deportivas/AGENTS.md` §16 |
| Flujo de módulos, plan de trabajo | `api-reservas-deportivas/AGENTS.md` §1, §14 |
| Comportamiento de la app, flujo de pantallas, tipos del PRD | `my-app/README.md`, `docs/04-app-movil.md` |
| Usuarios de demo, cuentas, passwords | `my-app/README.md` §6 |
| Levantar la app Expo, IP en red local | `my-app/README.md` §4 |

**Si algo no está documentado aquí y no está en los AGENTS.md de los proyectos:** preguntá antes de implementar. Lo mejor es revisar el `CHANGELOG.md` y los `docs/` del proyecto correspondiente.