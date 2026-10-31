# 07 · Pruebas y calidad

## 1. Resumen

| Parte | Qué se prueba | Herramienta | Cantidad (aprox.) | Cómo correrlas |
|---|---|---|---|---|
| API · unitarios | Reglas puras (grilla, reservas, ingreso, bloqueos, fechas, ids, config, errores…) | Vitest | 302 tests en 26 archivos | `pnpm test` |
| API · e2e | La app real contra una base real, endpoint por endpoint y por módulo | Vitest + Supertest | ~1160 tests | `pnpm test:e2e` |
| API · notificaciones | Alta/baja de tokens y envío a un Expo falso | Vitest | 25 tests | `pnpm test:notificaciones` |
| API · matriz | Los e2e contra PostgreSQL, MySQL y MariaDB | Docker / CI | — | `pnpm test:e2e:matriz` |
| API · calidad | Tipos, lint, formato | `tsc`, oxlint, prettier | — | `pnpm verificar` |
| App | **No hay tests automáticos** | — | 0 | Plan manual (§4) |

> Los números se midieron al correr la suite durante la elaboración de esta documentación
> (con SQLite). Pueden variar si se agregan tests.

## 2. API: estrategia

1. **Reglas puras con TDD** (`src/**/rules/*.spec.ts`): funciones sin base ni reloj, probadas con
   tablas de casos. Ejemplos de la grilla: día sin nada; fija y reserva en el mismo turno (gana
   la fija); bloqueo sobre fija (gana el bloqueo); fija con `hasta` ayer; fija de dos horas;
   bloqueo parcial; martes vs. miércoles cerca de la medianoche UTC.
2. **E2E por endpoint** (`test/e2e/*.e2e-spec.ts`): se levanta la aplicación completa
   (`test/utilities/create-app.ts`) con una base real y se llama con Supertest. Cada archivo
   corresponde a un módulo: `auth`, `venues`, `slots`, `bookings`, `check-ins`, `admin`,
   `favorites`, `files`, `schema-and-seeds`.
3. **Contrato** (`contract-coverage`, `test/utilities/contract.ts`): cada respuesta se valida
   contra `contract/schema.json` (generado desde los tipos): el cuerpo tiene **exactamente** la
   forma del PRD.
4. **Concurrencia**: dos `POST /reservas` simultáneos al mismo turno → uno 201 y otro 409
   `TURNO_OCUPADO`, en los cuatro motores.
5. **Verificación por módulo** (`test/verification/m0…m8`): una verificación independiente de
   cada módulo contra la especificación.
6. **Matriz de motores**: el CI repite los e2e contra PostgreSQL 17, MySQL 8.4 y MariaDB 11, y en
   dos zonas horarias (`UTC` y `America/Argentina/Buenos_Aires`) para detectar errores de hora.
7. **Reloj controlado**: los tests usan `RelojFijo` y lo avanzan (`avanzarMinutos`) para probar
   "30 minutos antes", "15 minutos después", "ya empezó", sin esperar.
8. **Notificaciones** (`test/notifications/`): un **servidor de Expo falso**
   (`fake-expo-server.ts`) registra los pedidos recibidos y responde tickets; así se verifica el
   formato del envío, las tandas de 100, el orden de tickets y el descarte de tokens inválidos.

### 2.1 Tests de notificaciones: qué comprueban

| Archivo | Casos |
|---|---|
| `devices.notifications-spec.ts` (19) | Alta: 201 + cuerpo; idempotencia; actualiza plataforma; cambia de dueño; varios teléfonos por usuario; **altas simultáneas**; también encargados. Baja: 204 y deja de recibir; **sólo tokens propios**; 400 si formato inválido. Prueba: `{dispositivos: 0}` sin llamar a Expo; sólo a los propios; **descarta `DeviceNotRegistered`**. Los tres endpoints piden sesión (401) |
| `sender.notifications-spec.ts` (6) | Un mensaje por token con título/cuerpo/datos; junta varios mensajes; **250 tokens → tandas 100+100+50**; sin mensajes no llama a Expo; ticket de error → token inválido; tickets en orden también entre tandas |

## 3. Calidad estática y CI

- **TypeScript** estricto (`tsc --noEmit`) en la API y en la app (`strict: true`).
- **oxlint** con `--deny-warnings` (un warning rompe `pnpm lint`; un `import` sin usar
  alcanza).
- **prettier** para el formato de la API.
- **GitHub Actions** (`.github/workflows/ci.yml`), tres trabajos:
  1. `verificar`: `pnpm install --frozen-lockfile` + `pnpm verificar`, en dos zonas horarias.
  2. `matriz`: e2e contra PostgreSQL/MySQL/MariaDB y S3Proxy.
  3. `docker`: `scripts/test-docker.mjs` (levanta la imagen y prueba `/salud`).
- ⚠️ `--frozen-lockfile` falla si `pnpm-lock.yaml` no coincide con `package.json`. Tras tocar
  dependencias hay que correr `pnpm install` y **commitear el lockfile**.

## 4. App: plan de pruebas manuales

No hay tests automáticos de la app. Este plan cubre los flujos del PRD con los datos de demo.
Requisitos: API corriendo con datos de demo (`pnpm db:reiniciar`), teléfono en la misma red.

### 4.1 Preparación

| # | Paso | Resultado esperado |
|---|---|---|
| P1 | Abrir `http://<IP>:3000/salud` en el navegador del teléfono | `{"datos":{"estado":"ok",…}}` |
| P2 | Poner la IP en `servicios/auth.ts` y `servicios/reservas.ts` | La app carga el catálogo |

### 4.2 Casos

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| T-01 | Catálogo sin cuenta | Abrir la app → pestaña Canchas | Aparecen 11 espacios con foto y precio, sin pedir cuenta |
| T-02 | Filtros | Filtrar por "Tenis" y por "Parque Berduc" | Quedan los 2 espacios de tenis |
| T-03 | Ficha | Tocar un espacio | Fotos, chips (superficie/luz/techado), reglas, precio. Sin video (`videoUrl: null`) |
| T-04 | Grilla 7 días | Ver disponibilidad | 7 pestañas de día; 16 turnos; libres en verde |
| T-05 | Estados | Mañana en `esp-04` | Sin turnos libres (mezcla de reservado/fijo/mantenimiento) |
| T-06 | Día bloqueado | Pasado mañana en una cancha descubierta | Todo en "Mantenimiento" |
| T-07 | Fija | `esp-02`, un martes, 21–22 | Figura "Ocupado" |
| T-08 | Turno pasado | Hoy, una hora ya transcurrida | "Finalizado" y no se puede tocar |
| T-09 | Reservar sin cuenta | Tocar un turno libre → Confirmar | Alerta "Falta iniciar sesión" |
| T-10 | Ingreso | `emiliano@mail.com` / `villaguay2026` | Entra a las pestañas |
| T-11 | Reservar | Elegir turno libre → Confirmar | "¡Reserva confirmada!" y QR |
| T-12 | Mis reservas | Pestaña Mis Reservas | Aparece la reserva nueva con su QR |
| T-13 | Doble reserva | Dos teléfonos reservan el mismo turno | Uno confirma; el otro recibe error de turno ocupado |
| T-14 | Límite de 3 | `lleno@demo.ar` intenta una cuarta | Error "Ya tenés tres reservas activas…" |
| T-15 | Cancelar | Cancelar una reserva con más de 4 h | "La reserva fue cancelada" |
| T-16 | Cancelar tarde | Reserva con menos de 4 h | Error de cancelación fuera de plazo |
| T-17 | Offline | Ver Mis Reservas, activar modo avión, volver a la pestaña | Cartel "Sin conexión" y las reservas con su QR |
| T-18 | Favoritos | Tocar el corazón en una ficha | Cambia el ícono; persiste al volver a entrar |
| T-19 | Perfil | Editar nombre/teléfono | Se actualiza y persiste |
| T-20 | Tema | Perfil → Apariencia → Oscuro | Cambia toda la app |
| T-21 | Mapa | Menú ☰ → Mapa | Marcadores de los 2 complejos; con permiso, punto azul |
| T-22 | Mapa sin ubicación | Negar el permiso | El mapa funciona igual |
| T-23 | Escáner | Ícono QR → huella → cámara | Pide huella/PIN, luego cámara |
| T-24 | Cerrar sesión | Perfil → Salir | Vuelve a login; no llegan más avisos de esa cuenta |
| T-25 | Huella al abrir | Cerrar y abrir la app con sesión | Pide huella/PIN antes de entrar |

### 4.3 Casos de notificaciones

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| N-01 | Prueba | Swagger → `POST /dispositivos/prueba` | `{ dispositivos: 1 }` y llega la push |
| N-02 | Reserva cancelada | Encargado bloquea un turno reservado por el usuario del teléfono | Llega "Reserva cancelada" con el motivo |
| N-03 | Turno liberado | A tiene el espacio de favorito; B reserva y cancela un turno futuro de ese espacio | A recibe "Se liberó un turno"; B no |
| N-04 | Toque con la app cerrada | Tocar la notificación | Pasa por la huella (si corresponde) y abre la pantalla correcta |
| N-05 | Cambio de dueño | Cerrar sesión y entrar con otra cuenta en el mismo teléfono | Los avisos llegan a la cuenta nueva, no a la anterior |
| N-06 | Baja | Cerrar sesión | La tabla `dispositivos` ya no tiene el token |

### 4.4 Casos de error de red

Con `SIMULACION_HABILITADA=true`, enviando la cabecera `X-Simular: error-500` o
`demora-3000` (por ejemplo desde Swagger/Postman o agregándola temporalmente al `fetch`):

| ID | Caso | Resultado esperado |
|---|---|---|
| E-01 | API apagada | Mensajes de "Sin conexión…" / listas vacías (no cierra la app) |
| E-02 | `error-500` al reservar | Alerta con un mensaje de error |
| E-03 | `demora-3000` en la grilla | Indicador de carga durante 3 s |

## 5. Mejoras recomendadas de pruebas (app)

- Tests unitarios (Jest + `jest-expo`) de las funciones puras: `formatearTurno`,
  `calcularEstadoVisual`, `generarProximosDias` (con la zona horaria como parámetro),
  `armarHtml`.
- Tests de componentes con React Native Testing Library para `Mis Reservas` (online/offline).
- Un test de contrato que valide las respuestas reales de la API contra `contract/schema.json`.
