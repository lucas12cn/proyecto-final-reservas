# 03 · La API (backend)

> **Origen:** la API la provee la cátedra. El grupo debe poder **explicarla** (la app depende de
> ella en cada pantalla) y **completó** el módulo de notificaciones (ver [05](05-notificaciones-push.md)).
> Las fuentes oficiales son `api-reservas-deportivas/README.md`, `AGENTS.md`,
> `docs/SPECIFICATION.md` y `docs/DECISIONS.md`; este documento las resume y las conecta con el
> código.

## 1. Mapa del código

```
api-reservas-deportivas/
├── contract/                  Tipos del contrato (api.ts, types.ts) y schema.json
├── src/
│   ├── main.ts                Arranque: carga .env, valida config, crea la app, escucha en 0.0.0.0
│   ├── setup-app.ts           Lo común a main y tests: CORS, filtros, pipes, Swagger
│   ├── app.module.ts          Módulo raíz (AppModule.registrar)
│   ├── config/environment.ts  Variables de entorno validadas (clase Configuracion)
│   ├── common/                Infraestructura compartida
│   │   ├── auth/              Guard global, JWT, scrypt, decoradores @Publico/@Roles
│   │   ├── clock/             Reloj inyectable (RelojSistema / RelojFijo)
│   │   ├── context/           Origen del pedido (para armar URLs de fotos)
│   │   ├── dates/             Zona horaria de Argentina, día de la semana, rangos
│   │   ├── db/                Columnas portables, opciones por motor, proveedores en la nube
│   │   ├── errors/            Catálogo de errores, ErrorApi, filtro de excepciones
│   │   ├── files/             Almacén de archivos (disco/S3), Range, tipos permitidos
│   │   ├── ids/               Generación y validación de ids con prefijo
│   │   ├── notifications/     Avisos, puertos, controlador /dispositivos
│   │   ├── response/          Sobre { datos, meta } y paginación
│   │   └── simulation/        Cabecera X-Simular (error-500, demora-N)
│   ├── modules/
│   │   ├── users/             /auth/*, /yo, /usuarios/:id, favoritos
│   │   ├── venues/            /deportes, /espacios
│   │   ├── slots/             /espacios/:id/turnos (la grilla), bloqueos y fijas (entidades)
│   │   ├── bookings/          /reservas, /yo/reservas, cancelación
│   │   ├── check-ins/         /ingresos, ausentes, agenda
│   │   ├── admin/             /bloqueos, /fijas, PATCH /espacios/:id
│   │   └── health/            /salud
│   ├── seeds/                 Datos de demo y reset de base
│   ├── student-notifications/ ← LO QUE COMPLETÓ EL GRUPO (tokens y envío de push)
│   └── tools/                 db:probar y archivos:probar
├── test/                      e2e, integración, verificación por módulo, utilidades
├── docs/                      PRD, especificación, decisiones, informes M0–M9
└── scripts/, compose*.yaml, Dockerfile, render.yaml, .github/workflows/ci.yml
```

Dentro de cada módulo de negocio la estructura se repite: `*.controller.ts` (rutas),
`*.service.ts` (orquestación), `*.entity.ts` (tabla), `*.mapper.ts` (entidad → tipo del PRD),
`dto/` (validación de entrada) y `rules/` (reglas puras con su `*.spec.ts`).

## 2. Ciclo de vida de un pedido

1. **`middlewareContextoPedido`** guarda el origen (`http://IP:3000`) para que los mapeadores
   armen URLs absolutas de fotos con la dirección que usó el teléfono.
2. **`middlewareSimulacion`** (si `SIMULACION_HABILITADA=true`): `X-Simular: error-500` responde
   `ERROR_INTERNO`; `X-Simular: demora-3000` retrasa la respuesta (máx. 30 s). Sirve para probar
   en la app los estados de error y de carga.
3. **`GuardAutenticacion`** (global): si la ruta no es `@Publico()`, exige
   `Authorization: Bearer <jwt>`, verifica firma y vencimiento (con el reloj de la API) y
   revisa `@Roles(...)`. Un rol insuficiente → `SIN_PERMISO` (403).
4. **`ValidationPipe`** (global): `whitelist` + `forbidNonWhitelisted` + `transform`. Devuelve
   `VALIDACION_FALLIDA` con el primer problema, en castellano. Un campo que sobra es error
   (`Sobra el dato «x»`).
5. **Controlador → servicio → reglas/repositorios.**
6. **Respuesta**: `respuestaUno(x)` → `{ datos: x, meta: null }`; `respuestaLista(xs, meta)` →
   `{ datos: xs, meta: { total, pagina, porPagina } }`.
7. **`FiltroExcepciones`**: convierte cualquier `ErrorApi` en `{ error: { codigo, mensaje } }`
   con el HTTP del catálogo. Lo inesperado se responde como `ERROR_INTERNO` (sin filtrar detalles).

## 3. Configuración (`config/environment.ts`)

Las variables se leen de `.env` (o del proceso) y se **validan al arrancar**: si algo está mal,
la API imprime la lista de problemas y termina (no arranca a medias).

| Variable | Default | Para qué |
|---|---|---|
| `PUERTO` | 3000 | Puerto HTTP |
| `ENTORNO` | `desarrollo` | `desarrollo` · `test` · `publicado` (este último exige base real, archivos en la nube, `JWT_SECRETO` ≥ 32 caracteres y sin simulación) |
| `DB_MOTOR` | `better-sqlite3` | `postgres` · `mysql` · `mariadb` |
| `DB_ARCHIVO` / `DB_URL` | `datos/api.sqlite` | Archivo SQLite o cadena de conexión |
| `DB_PROVEEDOR` | — | Preset de nube: `supabase`, `neon`, `aiven-postgres`, `aiven-mysql` |
| `DB_SINCRONIZAR` | `true` | Crea/ajusta las tablas desde las entidades |
| `SEMBRAR_SI_VACIA` | `true` | Carga los datos de demo si la base está vacía |
| `JWT_SECRETO` | clave de desarrollo | Firma de los tokens |
| `ARCHIVOS_PROVEEDOR` | `local` | `aws` · `supabase` · `r2` · `b2` · `s3proxy` · `localstack` |
| `NOTIFICACIONES` | `registro` | `registro` (sólo escribe en consola) · `expo` (envía de verdad) |
| `EXPO_PUSH_URL` | `https://exp.host/--/api/v2/push/send` | Endpoint de push de Expo |
| `SIMULACION_HABILITADA` | `true` | Habilita `X-Simular` |
| `RELOJ_FIJO` | vacío | Congela la hora: `2026-09-19T20:30:00-03:00` |

## 4. Base de datos

### 4.1 Cuatro motores, un solo código

Las entidades **sólo** usan los helpers de `common/db/columns.ts` (`ColumnaId`, `ColumnaRef`,
`ColumnaTexto(largo)`, `ColumnaEntero`, `ColumnaDecimal`, `ColumnaBooleana`, `ColumnaJson`,
`ColumnaDia`, `ColumnaHora`, `ColumnaInstante`, `ColumnaEnum`…), que eligen el tipo de columna
adecuado para SQLite, PostgreSQL, MySQL y MariaDB. Reglas de portabilidad:

- Los textos tienen **largo explícito** (MySQL lo exige). Los ids son `varchar(40)`.
- Fechas y horas se guardan como **texto** (`"2026-11-14"`, `"21:00"`) y los instantes con un
  tipo común; así el orden alfabético es el cronológico.
- La base se crea **desde las entidades** (`synchronize`). No hay migraciones.
- Las violaciones de índice único se detectan en `common/errors/uniqueness.ts`
  (`SQLITE_CONSTRAINT_UNIQUE`, `23505`, `ER_DUP_ENTRY`/`1062`) para traducirlas a errores de negocio.

### 4.2 Tablas

Ver el diagrama y las columnas en [06](06-modelo-de-datos-y-contrato.md). Resumen:
`usuarios`, `espacios_favoritos`, `deportes`, `espacios`, `reservas`, `reservas_fijas`,
`bloqueos`, y `dispositivos` (tokens de push, del grupo). **No existe tabla de turnos.**

## 5. Reglas de negocio y dónde viven

| Regla | Resumen | Archivo |
|---|---|---|
| R1–R6 | La grilla: 16 turnos; prioridad `mantenimiento > fijo > reservado > libre`; rango hoy…hoy+6 | `slots/rules/grid.ts`, `slots/slots.service.ts` |
| R7 | Validaciones de reservar, en orden | `bookings/bookings.service.ts#crear` |
| R8 | Nunca dos reservas en el mismo turno | `reserva.entity.ts` (`ocupacion` único) |
| R9 | Máximo tres reservas activas | `bookings.service.ts` (`MAXIMO_ACTIVAS`) |
| R10 | `cancelableHasta` = inicio − 4 h | `bookings/rules/bookings.ts` (`cancelableHasta`, `HORAS_DE_PLAZO_PARA_CANCELAR`) |
| R11 | Reintento = 200 con la reserva existente | `bookings.service.ts` |
| R12 | Cancelar: jugador dentro del plazo; personal siempre (y suma "tardía") | `bookings.service.ts` |
| R13 | `proximas` = confirmadas cuyo turno no terminó; `pasadas` = el resto | `bookings.service.ts` |
| R14 | Ingreso: código válido, de hoy, de ese espacio, una vez, desde 30 min antes | `check-ins/rules/check-in.ts` |
| R15 | Ausente: desde 15 min después del inicio; suma `ausencias` | `check-in.ts` |
| R16 | Roles: jugador no entra a rutas del personal | `session-guard.ts` |
| R17–R18 | Bloqueo: motivo obligatorio; cancela reservas (no cuentan como tardías) y avisa | `admin/admin.service.ts`, `admin/rules/blocks.ts` |
| R19 | Fijas: sin superponer; si chocan con reservas futuras → `CONFLICTO_CON_RESERVAS` | `admin/rules/standing-bookings.ts` |
| R20 | Precio entero > 0 | `admin/dto/admin.dto.ts` |
| R21 | Turno liberado → push a favoritos (salvo quien canceló) | `bookings.service.ts` (aviso "Se liberó un turno") |
| R22 | Recordatorio 2 h antes: **local del teléfono**, la API no lo manda | — (lo debe programar la app) |

### 5.1 La grilla (`armarGrilla`)

Función pura: recibe el espacio, la fecha y las reservas, fijas y bloqueos del espacio, y
devuelve los 16 turnos. Para cada hora `h` de 8 a 23:

```text
inicio = HH:00
bloqueo   = algún bloqueo sin horas (día completo) o con inicio ≤ h < fin
cubreFija = alguna fija activa, del mismo día de semana, con desde ≤ fecha ≤ hasta,
            y inicio ≤ h < fin
reserva   = alguna reserva NO cancelada que empieza en h

estado = bloqueo   ? "mantenimiento"
       : cubreFija ? "fijo"
       : reserva   ? "reservado"
       :             "libre"
```

Detalles que explican por qué la grilla es "la parte difícil":

- **Prioridad**: un bloqueo gana a una fija, y una fija a una reserva. Así, una reserva
  anterior no "pisa" un mantenimiento.
- Una fija de **dos horas cubre dos turnos** (`inicio ≤ h < fin`).
- El día de la semana se calcula **en hora argentina** (`diaDeSemana`): un martes a las 23:30
  local es miércoles en UTC y debe seguir siendo martes.
- `reservaId` sólo viene en turnos `reservado`; `motivoBloqueo` sólo en `mantenimiento`.
- `precio` es el `precioPorHora` **actual** del espacio (la reserva no guarda precio: D5).
- El **id del turno** es determinístico: `tur-esp-02-20260919-19`. `idDeTurno()` lo arma y
  `leerIdDeTurno()` lo desarma (valida el formato, que la fecha exista y que la hora sea 8–23).
- Los turnos que ya pasaron **se devuelven con su estado real**: es la app la que los marca
  como "Finalizado" (ver `calcularEstadoVisual` en `disponibilidad.tsx`); el servidor igual
  rechaza reservarlos (`TURNO_PASADO`).

### 5.2 Reservar sin doble reserva (`ReservasServicio.crear`)

Orden exacto de las validaciones (R7):

1. Se desarma `turnoId`; el espacio debe existir y estar activo → `TURNO_NO_ENCONTRADO`.
2. **Reintento (R11):** si ese jugador ya tiene ese turno → se devuelve su reserva con **200**.
3. Fecha en rango (hoy…hoy+6) → `FECHA_FUERA_DE_RANGO`.
4. El turno no empezó ya → `TURNO_PASADO`.
5. Se arma la grilla del día: `mantenimiento`/`fijo` → `TURNO_NO_DISPONIBLE`; `reservado` →
   `TURNO_OCUPADO`.
6. `cantidadPersonas ≤ capacidad` → `CAPACIDAD_EXCEDIDA`.
7. Menos de 3 reservas activas → `LIMITE_DE_RESERVAS`.
8. **INSERT** con `ocupacion = "<espacioId>|<fecha>|<inicio>"`.

El paso 5 es una *comprobación amistosa*; **la garantía real es el paso 8**: la columna
`ocupacion` tiene índice único y vale `NULL` en las reservas canceladas. Si dos jugadores
reservan a la vez, uno inserta y el otro recibe una violación de unicidad, que se traduce a
`TURNO_OCUPADO` (o a un 200 si la ganadora es del mismo jugador). El código QR
(`VGY-<MMDD>-<HH>-<6 aleatorios>`) también es único; ante una colisión rarísima se reintenta.

### 5.3 Cancelación, ingreso y ausencia

- **Cancelar** (`POST /reservas/:id/cancelacion`): el dueño sólo hasta `cancelableHasta`
  (`CANCELACION_FUERA_DE_PLAZO` después). El personal puede cancelar siempre y, si es tarde,
  suma 1 a `cancelacionesTardias` del dueño. Al cancelar se pone `ocupacion = NULL` (el turno
  vuelve a quedar libre) y, si el turno es futuro, se avisa a los favoritos.
- **Ingreso** (`POST /ingresos`, sólo personal): valida en orden código existente
  (`CODIGO_INVALIDO`), no cancelada (`RESERVA_CANCELADA`), de hoy (`CODIGO_DE_OTRO_DIA`), del
  espacio correcto (`CODIGO_DE_OTRO_ESPACIO`), sin ingreso previo (`INGRESO_YA_REGISTRADO`) y
  dentro de la ventana horaria (`FUERA_DE_HORARIO`). Queda `cumplida` con `ingresoEn`.
- **Ausente** (`POST /reservas/:id/ausente`): sólo `confirmada`, desde 15 min tras el inicio
  (`ANTES_DE_TIEMPO`). Queda `ausente` y suma 1 a `ausencias`.

### 5.4 Bloqueos y reservas fijas

`POST /bloqueos` corre en **una transacción**: crea el/los bloqueo(s), pasa a `cancelada` toda
reserva `confirmada` de los turnos cubiertos (sin contar como tardía) y, **después de confirmar
la transacción**, dispara un aviso por reserva cancelada. Una reserva fija nueva se rechaza si
se superpone con otra (`FIJA_SUPERPUESTA`) o si choca con reservas futuras
(`CONFLICTO_CON_RESERVAS`): el administrador las resuelve a mano (D4).

## 6. Errores

Un único catálogo (`common/errors/catalog.ts`). El **código** no cambia nunca (la app compara
contra él); el **mensaje** está listo para mostrarse en pantalla. Se lanza con
`throw new ErrorApi('TURNO_OCUPADO')`. La tabla completa está en
`api-reservas-deportivas/README.md` §8. Los que más ve el usuario de la app:

| Código | HTTP | Cuándo |
|---|---|---|
| `NO_AUTENTICADO` | 401 | Falta el token, venció o es inválido |
| `CREDENCIALES_INVALIDAS` | 401 | Email o contraseña incorrectos |
| `SIN_PERMISO` | 403 | Un jugador llama a un endpoint del personal |
| `TURNO_OCUPADO` | 409 | Otro jugador reservó primero |
| `TURNO_NO_DISPONIBLE` | 409 | Mantenimiento o reserva fija |
| `LIMITE_DE_RESERVAS` | 422 | Ya tiene 3 reservas activas |
| `CANCELACION_FUERA_DE_PLAZO` | 422 | Faltan menos de 4 horas |
| `EMAIL_YA_REGISTRADO` | 409 | Registro con un email existente |
| `VALIDACION_FALLIDA` | 400 | Dato faltante, mal formado o sobrante |

## 7. Archivos (fotos, audio, video)

`POST /archivos` (con sesión, `multipart/form-data`, campo `archivo`) valida el tipo real y el
tamaño (imagen jpeg/png/webp ≤ 5 MB; audio m4a/aac/mp3 ≤ 10 MB; video mp4 ≤ 30 MB) y devuelve
`{ url, tipo, bytes }`. `GET /archivos/<clave>` sirve el archivo y admite `Range` (necesario
para adelantar video/audio). El almacén es un **puerto** (`AlmacenArchivos`) con dos
implementaciones, disco (`local-storage.ts`) y S3 (`s3-storage.ts`); la app no nota la
diferencia porque las URLs las arma el mapeador con el origen del pedido. Las imágenes de las
semillas se suben por el mismo puerto.

> La app **no** usa hoy `POST /archivos`: la galería "Reportar" guarda fotos sólo en el
> teléfono (ver [04](04-app-movil.md) y [08](08-estado-actual-y-deuda-tecnica.md)).

## 8. Semillas (datos de demo)

`src/seeds/` carga los datos **relativos a la fecha de siembra** (o a `RELOJ_FIJO`), de modo que
siempre haya turnos "de hoy", "de mañana" y de la semana próxima. Incluyen los casos "feos" que
pide el PRD: un día entero bloqueado por lluvia, una grilla sin turnos libres (`esp-04`), una
fija todos los martes (`fij-07`), una fija de dos horas, un bloqueo parcial, un espacio sin
video, reservas canceladas/cumplidas/ausentes y un jugador con tres reservas activas.
`pnpm db:reiniciar` borra todo y vuelve a sembrar.

## 9. Documentación interactiva (Swagger)

<http://localhost:3000/docs>. Cada endpoint lleva ejemplos y los errores posibles; el botón
**Authorize** acepta el token de `POST /auth/ingreso` para probar los endpoints con candado
(entre ellos `POST /dispositivos/prueba`).
