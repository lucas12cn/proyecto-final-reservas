# 07 · Pruebas y calidad

## 1. Resumen

| Parte | Qué se prueba | Herramienta | Cantidad (aprox.) | Cómo correrlas |
|---|---|---|---|---|
| API · unitarios | Reglas puras (grilla, reservas, ingreso, bloqueos, fechas, ids, config, errores…) | Vitest | 302 tests en 26 archivos | `pnpm test` |
| API · e2e | La app real contra una base real, endpoint por endpoint y por módulo | Vitest + Supertest | ~1160 tests | `pnpm test:e2e` |
| API · notificaciones | Alta/baja de tokens y envío a un Expo falso | Vitest | 25 tests | `pnpm test:notificaciones` |
| API · matriz | Los e2e contra PostgreSQL, MySQL y MariaDB | Docker / CI | — | `pnpm test:e2e:matriz` |
| API · calidad | Tipos, lint, formato | `tsc`, oxlint, prettier | — | `pnpm verificar` |
| App · automáticas | Lógica de negocio, servicios contra una API simulada, sesión, notificaciones, caché y componentes de formulario | Jest 29 + `jest-expo` + Testing Library v14 | **215 pruebas en 19 archivos** (≈ 8 s) | `npm test` (en `my-app/`) |
| App · manuales | Pantallas completas, navegación, cámara, mapa, push en un teléfono real | Personas | 79 casos | Plan manual (§5) |

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
- **GitHub Actions**, en la carpeta `.github/workflows/` de la **raíz** del repositorio:
  - `api.yml` — tres trabajos: (1) `verificar`: `pnpm install --frozen-lockfile` + `pnpm verificar`,
    en dos zonas horarias; (2) `matriz`: e2e contra PostgreSQL/MySQL/MariaDB y S3Proxy; (3)
    `docker`: `scripts/test-docker.mjs` (levanta la imagen y prueba `/salud`).
  - `app.yml` — `npm ci`, `npx tsc --noEmit` (incluye las pruebas), `npm test -- --ci` y
    `npx expo config --type introspect` (valida `app.json`/`app.config.js`).
- ⚠️ **GitHub sólo ejecuta los workflows de la raíz.** La cátedra entregó el CI de la API en
  `api-reservas-deportivas/.github/workflows/ci.yml`, pensado para un repositorio que contenga sólo
  la API; en este monorepo **nunca se ejecutaba**. `api.yml` es ese mismo CI adaptado
  (`working-directory`, rutas de `.nvmrc`, lockfile y `package.json`). Se puede borrar el original.
  Los workflows nuevos **no se pudieron probar en GitHub** (sí se validó su sintaxis y se corrieron
  localmente los pasos de la app).
- ⚠️ `--frozen-lockfile` (pnpm) y `npm ci` fallan si el lockfile no coincide con `package.json`.
  Tras tocar dependencias hay que correr `pnpm install` / `npm install` y **commitear el lockfile**
  (`pnpm-lock.yaml` de la API está desactualizado: D-14).

## 4. App: pruebas automáticas

### 4.1 Cómo correrlas

```bash
cd my-app
npm test               # todas (≈ 8 s)
npm run test:watch     # vuelve a correr al guardar
npx jest __tests__/turnos.test.ts      # un solo archivo
npx jest --coverage --collectCoverageFrom='src/servicios/**/*.ts'   # cobertura
```

### 4.2 Cómo están armadas

| Pieza | Detalle |
|---|---|
| `jest.config.js` | Preset `jest-expo`; busca `__tests__/**/*.test.{ts,tsx}` (fuera de `src/app`, para que Expo Router no las tome por rutas) |
| `jest.global-setup.js` | Fija `TZ=America/Argentina/Buenos_Aires`: las pruebas corren siempre en hora argentina. Sin esto, en una computadora o CI en UTC **no se detecta** el error de la grilla de noche (en UTC la fecha local y la UTC coinciden) |
| `jest.setup.js` | Reemplaza los íconos (fuente nativa) por un texto `icono:<nombre>` |
| `tsconfig.json` → `"types": ["jest"]` | TypeScript 6 ya no incluye solo los tipos de `@types/*`: hay que declararlos para que `tsc` entienda `describe`, `expect`, `jest` |
| Simulaciones (`jest.mock`) | `expo-network`, `expo-secure-store` (en memoria), `expo-notifications`, `expo-device`, `expo-constants`, `expo-file-system` (clases `File`/`Paths` falsas), `expo-sqlite` (tablas en memoria), `expo-router` y `fetch` |
| Testing Library v14 | `render`, `renderHook` y `fireEvent` son **asíncronos** (`await render(...)`); usa el paquete `test-renderer` |

### 4.3 Qué cubre cada archivo

| Archivo | Pruebas | Qué comprueba |
|---|---|---|
| `turnos.test.ts` | 16 | Desarmar el id de turno (inicio en UTC-3, ids con guiones, ids inválidos); `aFechaLocal` usa la fecha **local**; `desplazarDia` cruzando mes/año/bisiesto; `etiquetaDelDia`; `plazoDeCancelacion` (hoy, otro día, vencido, justo en el límite, dato inválido); hora desde la que se puede marcar ausente |
| `errores.test.ts` | 12 | El mensaje de la API se muestra (nunca `[object Object]`); cuerpo ilegible; `NO_AUTENTICADO` avisa la sesión vencida y los demás errores no; el aviso se puede cancelar; `SIN_SESION` |
| `geo.test.ts` | 8 | Distancia (Haversine), formato "850 m"/"2,3 km", complejo más cercano |
| `bloqueos.test.ts` | 7 | Reservas que cancelaría un bloqueo: día entero, tramo `[inicio, fin)`, varios espacios, estados no confirmados, sin espacios |
| `archivos.test.ts` | 9 | Nombre de caché independiente de la IP, extensión, hash; descargar sólo si falta; borrar el archivo incompleto si la descarga falla |
| `reservas.test.ts` | 36 | Cada servicio con `fetch` simulado: cuerpo y cabeceras enviados, errores de la API, **catálogo con respaldo sin conexión**, paginación de listados (varias páginas, sin bucle infinito), bloqueo de día entero **sin** `inicio`/`fin`, fijas, precios, ausentes, ingreso, permisos del encargado |
| `auth.test.ts` | 12 | Ingreso, registro, perfil, alta y baja del dispositivo (token codificado en la URL), todo sin sesión |
| `db.test.ts` | 6 | Caché del catálogo: se abre al primer uso, ida y vuelta por JSON, **guardar reemplaza la lista completa**, deportes aparte |
| `config.test.ts` | 15 | Dirección de la API: `normalizarUrlApi` (esquema, barras, puerto, rechaza ruta/ftp/basura); prioridad **app > `EXPO_PUBLIC_API_URL` > por defecto**; un valor guardado inválido o un `kv-store` caído no rompen; `fijarApiUrl` rige de inmediato, **sobrevive al cierre de la app** y se puede borrar |
| `servidor.test.ts` | 6 | `probarServidor`: ok con `estado: "ok"`, tiempo máximo de espera, sin conexión, error HTTP, respuesta que no es la API, cuerpo que no es JSON |
| `mapa.test.ts` | 5 | `mapaDisponible`: iPhone y Expo Go sí; APK de Android **sí con clave y no sin ella** |
| `selectorServidor.test.tsx` | 10 | Cuadro *Servidor*: muestra la dirección, prueba, guarda, **pregunta antes de guardar una dirección que no responde**, **cierra la sesión al cambiar de servidor**, restablece |
| `notificaciones.test.ts` | 23 | Recordatorio local (2 h antes, id por reserva, cancela antes de reprogramar, no programa si no está confirmada / faltan < 2 h / sin permiso / turno ilegible, nunca lanza); registro del token (`projectId`, canal de Android, emulador, permiso denegado); baja; manejador con la app abierta |
| `AuthContext.test.tsx` | 14 | Arranque con y sin sesión; login/registro; **logout da de baja el teléfono antes de borrar la sesión**; **el logout y la sesión vencida borran las reservas guardadas** (privacidad entre cuentas); sesión vencida (un solo aviso aunque fallen varios pedidos; no se dispara durante un logout) |
| `misReservas.test.ts` | 11 | Carga con respaldo: API si hay red, **API también con `isInternetReachable` en `false` o ausente (wifi sin internet)**, caché sin red, caché si la API falla, y sin caché si la sesión venció |
| `cacheReservas.test.ts` | 6 | Copia local de "Mis reservas": ida y vuelta por JSON, una fila por filtro, reemplazo, `null` si no hay nada, borrado total |
| `formato.test.ts` | 3 | `pesos`: "$9.500", sin separador por debajo de mil, redondeo |
| `tema.test.tsx` | 7 | Tema: arranca con el modo guardado (sin destello), cambiarlo lo guarda y sobrevive a "reabrir" la app, valor inválido o `kv-store` caído no rompen, claro/oscuro |
| `componentes.test.tsx` | 9 | `Paso`, `SelectorDia` y `ListaEspacios` (límites, "Todas"/"Ninguna", modo único) |

### 4.4 ¿Las pruebas realmente detectan errores?

Una prueba que nunca falla no sirve. Para comprobarlo se introdujeron **dieciocho errores a
propósito** (uno por vez, restaurando después) y se verificó que alguna prueba se rompiera:

| Error introducido | Detectado por |
|---|---|
| Huso horario del turno `-03:00` → `-04:00` | `turnos` (2 pruebas) |
| `aFechaLocal` usando `toISOString()` (el error B-02) | `turnos` — **sólo** gracias al `TZ` fijo de `jest.global-setup.js` |
| No avisar la sesión vencida | `errores` |
| Recordatorio 1 h antes en lugar de 2 | `notificaciones` (3 pruebas) |
| Bloqueo de día entero que manda `inicio` y `fin` | `reservas` |
| Fin de bloqueo inclusivo (`<` → `<=`) | `bloqueos` (3 pruebas) |
| `logout` borra la sesión antes de dar de baja el teléfono | `AuthContext` |
| Volver a exigir `isInternetReachable` en "Mis reservas" (el error de la wifi sin internet) | `misReservas` (2 pruebas) |
| No usar lo guardado cuando la API falla | `misReservas` (2 pruebas) |
| Mostrar lo guardado aun con la sesión vencida | `misReservas` (2 pruebas) |
| No borrar las reservas guardadas al cerrar sesión | `AuthContext` (2 pruebas) |
| Que un fallo al borrar la copia local rompa el cierre de sesión | `AuthContext` |
| La dirección elegida en la app deja de tener prioridad sobre la del entorno | `config` (4 pruebas) |
| Aceptar direcciones con ruta (`http://IP:3000/api`) | `config` |
| Dar el mapa por disponible en Android sin clave de Google | `mapa` (2 pruebas) |
| No cerrar la sesión al cambiar de servidor | `selectorServidor` |
| Dar por buena cualquier respuesta de `/salud` | `servidor` (2 pruebas) |
| Guardar sin preguntar cuando la dirección no responde | `selectorServidor` |

La primera vez la mutación de `aFechaLocal` **no** se detectaba (el entorno estaba en UTC):
por eso las pruebas fijan la zona horaria.

### 4.5 Cobertura medida

Sobre `src/servicios`, `src/contexto`, `src/componentes` y `src/providers`: **95,3 % de sentencias y
93,3 % de ramas**. Todos los archivos superan el 90 % de sentencias, salvo `db.ts` (69 %: sus
funciones de `reservas_locales` y la preferencia de complejo no las usa ninguna pantalla). El punto más
flojo es `reservas.ts` en ramas (73 %): varios caminos de error de lectura.

### 4.6 Qué NO cubren (límites)

- **Pantallas completas** (`app/**`): no hay pruebas de render de "Mis reservas", la grilla, el
  escáner, el mapa, etc. Se prueban a mano (§5). La lógica que contenían (plazo de cancelación,
  distancias, reservas afectadas por un bloqueo, habilitación de ausente) se extrajo a
  `servicios/` justamente para poder probarla.
- **Navegación** de Expo Router y el toque de una notificación (`NavegarAlTocarAviso`).
- **Capacidades nativas reales**: cámara, ubicación, biometría, SQLite real, notificaciones en un
  teléfono. Las pruebas usan simulaciones: confirman que el código usa bien la API de Expo, no que
  el teléfono responda.
- **Contrato real con la API**: `fetch` está simulado. Los pedidos se verificaron aparte contra la
  API local (ver el cierre de la prioridad 12); no hay una prueba automática que los repita.

## 5. App: plan de pruebas manuales

Complementa a las pruebas automáticas (§4): cubre las pantallas, la navegación y las capacidades del teléfono con los datos de demo.
Requisitos: API corriendo con datos de demo (`pnpm db:reiniciar`), teléfono en la misma red.

### 5.1 Preparación

| # | Paso | Resultado esperado |
|---|---|---|
| P1 | Abrir `http://<IP>:3000/salud` en el navegador del teléfono | `{"datos":{"estado":"ok",…}}` |
| P2 | Poner la IP en `servicios/auth.ts` y `servicios/reservas.ts` | La app carga el catálogo |

### 5.2 Casos

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
| T-44 | Bloqueos (personal) | Como `marcelo@villaguay.demo.ar`: menú ☰ → Bloqueos | Lista los bloqueos programados (ordenados por fecha) con espacio, tramo y motivo |
| T-45 | Nuevo bloqueo, día entero | Nuevo → elegir 1 espacio y un día futuro, "Todo el día", motivo → Bloquear | Se crea; en la grilla de ese espacio y día todo figura "Mantenimiento" |
| T-46 | Aviso de reservas afectadas | En el formulario, elegir un espacio y día con una reserva confirmada | Aparece "⚠️ 1 reserva confirmada se va a cancelar…"; en la confirmación también se aclara |
| T-47 | Bloqueo por tramo | Apagar "Todo el día", Desde/Hasta | El fin siempre queda después del inicio; se bloquea sólo ese tramo |
| T-48 | Motivo obligatorio | Bloquear sin motivo | Alerta "Escribí el motivo del bloqueo." |
| T-49 | Quitar un bloqueo | Tocar el tacho de un bloqueo → Quitar | Desaparece y los turnos vuelven a estar libres; las reservas canceladas siguen canceladas |
| T-50 | Reservas fijas (administrador) | Como `nahuel@villaguay.demo.ar`: menú ☰ → Reservas fijas | Lista las 4 fijas de demo con titular, espacio, día y horario |
| T-51 | Fija superpuesta | Nueva fija en `esp-02`, martes 21:00 a 22:00 | Alerta "Ya hay una reserva fija en ese horario." |
| T-52 | Nueva fija y baja | Crear una fija válida; luego darla de baja | Aparece como ocupada en la grilla del día correspondiente; al darla de baja vuelve a estar libre |
| T-53 | Precios (administrador) | Menú ☰ → Precios → tocar un espacio → cambiar el valor | Se actualiza en la lista y en la ficha del espacio |
| T-54 | Precio inválido | Guardar 0 o vacío | "Escribí un número entero de pesos, mayor que cero." |
| T-55 | Roles | Como encargado: menú ☰ | Ve Agenda y Bloqueos, **no** Reservas fijas ni Precios; como jugador no ve ninguna |
| T-31 | Recordatorio | Reservar el turno que empiece dentro de 2 a 3 horas y esperar a que falten 2 h | Llega "Tu turno es en 2 horas" y al tocarla abre Mis Reservas |
| T-32 | Recordatorio cancelado | Reservar y cancelar | No llega el recordatorio |
| T-33 | Catálogo sin conexión | Abrir Canchas con conexión, activar modo avión y reabrir la app | La lista, los filtros y la ficha siguen disponibles |
| T-34 | Foto y video sin conexión | Abrir una ficha con conexión (esperar unos segundos), modo avión, volver a abrirla | La foto principal y el video ("Guardado offline") se ven |
| T-60 | Wifi sin internet | Conectar el teléfono a una red local **sin salida a internet** (hotspot sin datos o un router sin WAN) con la API en la notebook → Mis reservas | Muestra las reservas **actuales** de la API, sin el cartel "Sin conexión" |
| T-61 | Otra cuenta no ve reservas ajenas | Con `emiliano@mail.com` abrir Mis reservas; cerrar sesión; ingresar con `nuevo@demo.ar`; activar modo avión; abrir Mis reservas | Lista vacía: no aparecen las reservas de la cuenta anterior |
| T-62 | Servidor desde la app | Entrada o Perfil → Servidor → Cambiar → una IP equivocada → Probar; luego la correcta → Probar → Guardar | Con la equivocada dice que no se pudo conectar (y al guardar pregunta); con la correcta dice "✓ La API responde.", cierra la sesión si había una y el catálogo carga. Al cerrar y abrir la app sigue la IP elegida |
| T-56 | Grilla: precio | Abrir la disponibilidad de un espacio | Cada turno libre dice "Disponible · $12.000" |
| T-57 | Grilla: mantenimiento y fijo | Día con bloqueo ("Cancha anegada") y un martes con reserva fija | El bloqueo muestra su motivo; la fija dice "Fijo" (no "Ocupado") |
| T-58 | Tema guardado | Perfil → Apariencia → Oscuro; cerrar la app del todo y abrirla | Sigue en oscuro |
| T-59 | Foto de la ficha | Ficha → Reportar → elegir una foto | Alerta "Foto guardada · Quedó guardada en este teléfono." (no dice "subido") |
| T-37 | Agenda (personal) | Ingresar como `marcelo@villaguay.demo.ar` → menú ☰ → Agenda del día | Lista las reservas de hoy, ordenadas por hora, con cancha y personas |
| T-38 | Agenda sólo para personal | Ingresar como jugador → menú ☰ | No aparece "Agenda del día" |
| T-39 | Cambiar de día | Tocar ‹ y › y el título | Cambia el día; el título vuelve a "Hoy" |
| T-40 | Contacto | "Ver contacto" en una reserva | Muestra nombre y teléfono; "Llamar" abre el marcador del teléfono |
| T-41 | Ausente antes de tiempo | Reserva cuyo turno empezó hace menos de 15 min | "No se presentó" atenuado y el texto "Se puede marcar desde las HH:MM" |
| T-42 | Marcar ausente | Reserva `confirmada` cuyo turno empezó hace 15 min o más → "No se presentó" → confirmar | Pasa a "No se presentó" y, en el perfil del jugador, sube **Ausencias** en 1 |
| T-43 | Reserva que ya ingresó | Escanear su QR y abrir la agenda | Figura "Ingresó HH:MM" y no tiene botón de ausente |

### 5.3 Casos de notificaciones

| ID | Caso | Pasos | Resultado esperado |
|---|---|---|---|
| N-01 | Prueba | Swagger → `POST /dispositivos/prueba` | `{ dispositivos: 1 }` y llega la push |
| N-02 | Reserva cancelada | Encargado bloquea (menú ☰ → Bloqueos) un turno reservado por el usuario del teléfono | Llega "Reserva cancelada" con el motivo |
| N-03 | Turno liberado | A tiene el espacio de favorito; B reserva y cancela un turno futuro de ese espacio | A recibe "Se liberó un turno"; B no |
| N-04 | Toque con la app cerrada | Tocar la notificación | Pasa por la huella (si corresponde) y abre la pantalla correcta |
| N-05 | Cambio de dueño | Cerrar sesión y entrar con otra cuenta en el mismo teléfono | Los avisos llegan a la cuenta nueva, no a la anterior |
| N-06 | Baja | Cerrar sesión | La tabla `dispositivos` ya no tiene el token |

### 5.4 Prueba del build (APK `preview`)

Con el APK `preview`, **no** con Expo Go (cambian los permisos y el tráfico `http` a la red local lo habilita `app.config.js` sólo en `preview`/`development`). La API corre en la notebook:

| ID | Caso | Resultado esperado |
|---|---|---|
| B-01 | Instalar el APK y abrir la app | Nombre "Deportes Villaguay" bajo el ícono; abre sin cerrarse |
| B-07 | Servidor en el APK | Servidor → Cambiar → `http://IP-de-la-notebook:3000` → Probar → Guardar (misma wifi, API encendida) | "✓ La API responde."; el catálogo carga por `http` y se puede iniciar sesión |
| B-08 | Mapa en un APK sin clave de Google | Menú ☰ → Mapa de Complejos | Muestra la **lista de complejos** con distancia (si hay ubicación) y "Cómo llegar"; no se cierra la app |
| B-02 | Escáner | Pide el permiso de cámara con el texto en castellano |
| B-03 | Mapa | Pide la ubicación con el texto en castellano; si se niega, el mapa funciona igual. **En Android se dibuja sólo si el build tiene `GOOGLE_MAPS_API_KEY`** |
| B-04 | Reportar foto | Pide acceso a fotos (sin pedir micrófono ni cámara) |
| B-05 | Push | Con credenciales FCM cargadas, `POST /dispositivos/prueba` llega al teléfono |
| B-06 | iPhone (si hay build) | Los permisos y Face ID muestran sus textos; la app no se cierra al pedirlos |

### 5.5 Casos de error de red

Con `SIMULACION_HABILITADA=true`, enviando la cabecera `X-Simular: error-500` o
`demora-3000` (por ejemplo desde Swagger/Postman o agregándola temporalmente al `fetch`):

| ID | Caso | Resultado esperado |
|---|---|---|
| E-01 | API apagada | Mensajes de "Sin conexión…" / listas vacías (no cierra la app) |
| E-02 | `error-500` al reservar | Alerta con un mensaje de error |
| E-03 | `demora-3000` en la grilla | Indicador de carga durante 3 s |

## 6. Mejoras recomendadas de pruebas (app)

- Pruebas de render de las pantallas con Testing Library (primero "Mis reservas" en línea y sin
  conexión, la agenda y el formulario de bloqueos), simulando `expo-router`.
- Una prueba que valide las respuestas reales de la API contra `contract/schema.json`.
- Pruebas end-to-end en un teléfono o emulador (por ejemplo con Maestro) del flujo
  ingresar → reservar → ver el QR.
