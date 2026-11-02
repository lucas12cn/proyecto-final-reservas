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
| T-09 | Reservar sin cuenta | Tocar un turno libre → Confirmar | Alerta "Falta iniciar sesión" con botón **Ingresar** |
| T-10 | Ingreso | `emiliano@mail.com` / `villaguay2026` | Entra a las pestañas |
| T-11 | Reservar | Elegir turno libre → Confirmar | "¡Reserva confirmada!" y QR |
| T-12 | Mis reservas | Pestaña Mis Reservas | Aparece la reserva nueva con su QR |
| T-13 | Doble reserva | Dos teléfonos reservan el mismo turno | Uno confirma; el otro ve "Ese turno ya fue reservado." con el botón **Ver otros turnos** |
| T-14 | Límite de 3 | `lleno@demo.ar` intenta una cuarta | Alerta con el mensaje de la API (no `[object Object]`) |
| T-15 | Cancelar | Cancelar una reserva con más de 4 h | "La reserva fue cancelada" |
| T-16 | Cancelar tarde | Reserva con menos de 4 h | No aparece el botón; dice "Ya pasó el plazo para cancelar. Avisale al encargado." |
| T-17 | Offline | Ver Mis Reservas, activar modo avión, volver a la pestaña | Cartel "Sin conexión" y las reservas con su QR |
| T-18 | Favoritos | Tocar el corazón en una ficha | Cambia el ícono; persiste al volver a entrar |
| T-19 | Perfil | Editar nombre/teléfono | Se actualiza y persiste |
| T-20 | Tema | Perfil → Apariencia → Oscuro | Cambia toda la app |
| T-21 | Mapa | Menú ☰ → Mapa | Marcadores de los 2 complejos; con permiso, punto azul; al tocar un marcador aparece la tarjeta con las canchas y la distancia |
| T-22 | Mapa sin ubicación | Negar el permiso | El mapa funciona igual (sin punto azul ni distancias) |
| T-35 | Cómo llegar | En la tarjeta de un complejo, tocar "Cómo llegar" | Se abre Google Maps con la ruta hasta el complejo |
| T-36 | Complejo más cercano | Con permiso de ubicación | El marcador del complejo más cercano va en verde y la tarjeta dice "El más cercano" |
| T-23 | Escáner (personal) | Ingresar como `marcelo@villaguay.demo.ar` → ícono QR → huella → cámara | Pide huella/PIN, luego cámara; un código válido registra el ingreso |
| T-24 | Cerrar sesión | Perfil → Salir | Vuelve a login; no llegan más avisos de esa cuenta |
| T-25 | Huella al abrir | Cerrar y abrir la app con sesión | Pide huella/PIN antes de entrar |
| T-26 | Escáner sólo para personal | Ingresar como jugador | No se ve el ícono QR en la cabecera |
| T-27 | Ingreso rechazado | Escanear un código de otro día / otra cancha / ya usado | "Ingreso rechazado" con el mensaje de la API |
| T-28 | Cantidad de personas | Confirmar una reserva bajando el selector | El ingreso (T-27) y la reserva muestran esa cantidad |
| T-29 | Fecha por la noche | Entre las 21:00 y 24:00, abrir la grilla | "Hoy" muestra los turnos de hoy y los 7 días cargan |
| T-30 | Sesión vencida | Borrar o alterar el token (o esperar 30 días) y recargar Mis Reservas | Aviso "Sesión vencida" y vuelve al ingreso |
| T-31 | Recordatorio | Reservar el turno que empiece dentro de 2 a 3 horas y esperar a que falten 2 h | Llega "Tu turno es en 2 horas" y al tocarla abre Mis Reservas |
| T-32 | Recordatorio cancelado | Reservar y cancelar | No llega el recordatorio |
| T-33 | Catálogo sin conexión | Abrir Canchas con conexión, activar modo avión y reabrir la app | La lista, los filtros y la ficha siguen disponibles |
| T-34 | Foto y video sin conexión | Abrir una ficha con conexión (esperar unos segundos), modo avión, volver a abrirla | La foto principal y el video ("Guardado offline") se ven |
| T-37 | Agenda (personal) | Ingresar como `marcelo@villaguay.demo.ar` → menú ☰ → Agenda del día | Lista las reservas de hoy, ordenadas por hora, con cancha y personas |
| T-38 | Agenda sólo para personal | Ingresar como jugador → menú ☰ | No aparece "Agenda del día" |
| T-39 | Cambiar de día | Tocar ‹ y › y el título | Cambia el día; el título vuelve a "Hoy" |
| T-40 | Contacto | "Ver contacto" en una reserva | Muestra nombre y teléfono; "Llamar" abre el marcador del teléfono |
| T-41 | Ausente antes de tiempo | Reserva cuyo turno empezó hace menos de 15 min | "No se presentó" atenuado y el texto "Se puede marcar desde las HH:MM" |
| T-42 | Marcar ausente | Reserva `confirmada` cuyo turno empezó hace 15 min o más → "No se presentó" → confirmar | Pasa a "No se presentó" y, en el perfil del jugador, sube **Ausencias** en 1 |
| T-43 | Reserva que ya ingresó | Escanear su QR y abrir la agenda | Figura "Ingresó HH:MM" y no tiene botón de ausente |

### 4.3 Casos de notificaciones

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| N-01 | Prueba | Swagger → `POST /dispositivos/prueba` | `{ dispositivos: 1 }` y llega la push |
| N-02 | Reserva cancelada | Encargado bloquea un turno reservado por el usuario del teléfono | Llega "Reserva cancelada" con el motivo |
| N-03 | Turno liberado | A tiene el espacio de favorito; B reserva y cancela un turno futuro de ese espacio | A recibe "Se liberó un turno"; B no |
| N-04 | Toque con la app cerrada | Tocar la notificación | Pasa por la huella (si corresponde) y abre la pantalla correcta |
| N-05 | Cambio de dueño | Cerrar sesión y entrar con otra cuenta en el mismo teléfono | Los avisos llegan a la cuenta nueva, no a la anterior |
| N-06 | Baja | Cerrar sesión | La tabla `dispositivos` ya no tiene el token |

### 4.4 Prueba del build (APK `preview` o `production`)

Con un build real, **no** con Expo Go (cambian los permisos y no se permite `http://`):

| ID | Caso | Resultado esperado |
|---|---|---|
| B-01 | Instalar el APK y abrir la app | Nombre "Deportes Villaguay" bajo el ícono; carga el catálogo desde la API publicada (https) |
| B-02 | Escáner | Pide el permiso de cámara con el texto en castellano |
| B-03 | Mapa | Pide la ubicación con el texto en castellano; si se niega, el mapa funciona igual. **En Android se dibuja sólo si el build tiene `GOOGLE_MAPS_API_KEY`** |
| B-04 | Reportar foto | Pide acceso a fotos (sin pedir micrófono ni cámara) |
| B-05 | Push | Con credenciales FCM cargadas, `POST /dispositivos/prueba` llega al teléfono |
| B-06 | iPhone (si hay build) | Los permisos y Face ID muestran sus textos; la app no se cierra al pedirlos |

### 4.5 Casos de error de red

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
