# 01 · Planificación y requerimientos

> **Nota de método.** El repositorio no contiene un cronograma ni actas del grupo: se publicó
> como un único commit. Esta planificación se **reconstruye a partir de las fuentes que sí
> existen**: el PRD, la especificación de la API (`SPECIFICATION.md`, `DECISIONS.md`) y el
> estado real del código. Los apartados que dependen de datos del grupo (fechas, reparto de
> tareas) están marcados `COMPLETAR` para que los integrantes los llenen antes de la defensa.

## 1. Contexto y problema

La Dirección de Deportes de Villaguay (Entre Ríos) administra **once espacios deportivos
municipales**: 2 canchas de fútbol 5 y 1 de fútbol 11 en el Polideportivo Municipal, 3 de
básquet, 2 de vóley, 2 de tenis en el Parque Berduc y 1 gimnasio cerrado.

Hasta ahora el sistema de reservas era el teléfono del director y una libreta, con una segunda
libreta del encargado. El PRD cuenta tres incidentes del mes anterior que son la razón de ser
del sistema:

| Incidente | Qué falla | Cómo lo resuelve el sistema |
|---|---|---|
| Dos grupos reservaron la misma cancha el mismo viernes a las 21 | Dos fuentes de verdad sin sincronizar | Una única base de datos con restricción de unicidad por turno (la doble reserva es imposible) |
| Lluvia: la cancha 2 quedó impracticable y no se pudo avisar a seis grupos | Sin canal de aviso | Bloqueo con motivo + **notificación push** a cada afectado |
| 30 % de los turnos reservados no se usó | Nadie avisa ni se mide | Cancelación con botón, recordatorio, registro de ausencias y de cancelaciones tardías |

**Objetivo del producto:** que la gente vea qué hay libre y reserve sola, reciba recordatorios,
cancele con un botón y entre el día del turno mostrando un QR que el encargado verifica.

## 2. Alcance

### 2.1 Dentro del alcance (PRD, primera versión)

1. **Espacios**: listado con foto, deporte, superficie e iluminación; filtros por deporte y
   complejo; ficha con fotos, características, precio, reglas y video; mapa de complejos.
2. **Disponibilidad**: grilla de turnos de una hora (08–24) por espacio y día, próximos siete
   días; estados libre / ocupado / mantenimiento; turnos pasados no reservables; **reservas
   fijas** contempladas.
3. **Reservar y mis reservas**: reservar en dos toques; reservas próximas e historial; cancelar
   hasta cuatro horas antes; marcar a quien cancela tarde repetidas veces; máximo tres
   reservas activas.
4. **Ingreso**: la reserva muestra un QR; el encargado lo escanea en la puerta y queda
   registrado; mensajes claros si el código es de otro día o de otra cancha; marcar ausentes.
5. **Avisos**: recordatorio dos horas antes; aviso de suspensión por lluvia/mantenimiento;
   aviso cuando se libera un turno de un espacio favorito.
6. **Administración** (misma app, cuenta de encargado/administrador): bloqueos, reservas fijas,
   agenda del día, escaneo, precio por hora.

### 2.2 Fuera del alcance (PRD)

Pagos y señas online, torneos y tablas, armado de equipos, canchas privadas, alquiler de
elementos. **La app muestra el precio, no cobra.**

### 2.3 Restricciones impuestas por el PRD

| Tema | Restricción |
|---|---|
| Plataforma | Android y iPhone (mayoría Android) |
| Framework | React Native con Expo, TypeScript, Expo Router |
| Estilos | `StyleSheet` (Unistyles/NativeWind opcionales) |
| Entrega | Build de producción con EAS (configuración lista en `eas.json`; ver [README §5](../README.md)) |
| Datos | Al principio, datos inventados (`mocks`) detrás de una capa de servicios; luego la API de la cátedra |
| Sesión | Token en `expo-secure-store`, nunca en `kv-store` |
| Conectividad | La reserva y su QR deben verse **sin conexión** (la señal en la cancha es mala) |
| Acceso | No pedir cuenta para mirar disponibilidad; la cuenta se exige al reservar |
| Ubicación | Si se niega el permiso, todo sigue funcionando; la ubicación es sólo para el mapa |
| Visual | Legible con poca luz: modo oscuro |

## 3. Requisitos funcionales

`RF` = requisito funcional. La columna *Estado* resume la implementación en la app; el detalle
y las diferencias están en [08](08-estado-actual-y-deuda-tecnica.md).

| ID | Requisito | Origen | Estado en la app |
|---|---|---|---|
| RF-01 | Listar los espacios con foto, deporte, superficie, luz | PRD §1 | ✅ `(tabs)/espacios.tsx` |
| RF-02 | Filtrar por deporte y complejo | PRD §1 | ✅ (en el cliente) |
| RF-03 | Ficha del espacio: fotos, características, precio, reglas | PRD §1 | ✅ `espacio/[id].tsx` |
| RF-04 | Video del espacio (reproducción) | PRD §1 | ✅ `expo-video` |
| RF-05 | Mapa de complejos y "cómo llegar" | PRD §1 | ✅ mapa nativo (`react-native-maps`), tarjeta por complejo con distancia y botón "Cómo llegar" |
| RF-06 | Grilla de un espacio por día, 7 días | PRD §2 | ✅ `espacio/disponibilidad.tsx` |
| RF-07 | Turno pasado no reservable | PRD §2 | ✅ (cliente y servidor) |
| RF-08 | Reservas fijas visibles como ocupadas | PRD §2 | ✅ (resuelto por la API en el estado `fijo`) |
| RF-09 | Reservar un turno libre | PRD §3 | ✅ con selector de cantidad de personas (1 a la capacidad) |
| RF-10 | Ver reservas próximas e historial | PRD §3 | ✅ `(tabs)/index.tsx` |
| RF-11 | Cancelar una reserva (hasta 4 h antes) | PRD §3 | ✅ (la regla la aplica la API) |
| RF-12 | Marcar a quien cancela tarde | PRD §3 | ✅ contador visible en el perfil |
| RF-13 | Máximo tres reservas activas | PRD §3 | ✅ (la API devuelve `LIMITE_DE_RESERVAS`) |
| RF-14 | Mostrar el QR de la reserva | PRD §4 | ✅ `react-native-qrcode-svg` |
| RF-15 | Encargado escanea el QR y se registra el ingreso | PRD §4 | ✅ `POST /ingresos`; el escáner es sólo para personal |
| RF-16 | Mensajes claros si el código no corresponde | PRD §4 | ✅ se muestra el mensaje de la API |
| RF-17 | Marcar "no se presentó" | PRD §4 | ✅ pantalla **Agenda del día** (personal): desde 15 min después del inicio |
| RF-18 | Recordatorio 2 h antes | PRD §5 | ✅ notificación **local** programada al reservar (a confirmar en un teléfono) |
| RF-19 | Aviso por suspensión (bloqueo) | PRD §5 | ✅ push del servidor |
| RF-20 | Aviso por turno liberado en favorito | PRD §5 | ✅ push del servidor |
| RF-21 | Marcar espacios favoritos | PRD §5 | ✅ corazón en la ficha |
| RF-22 | Registro, ingreso y perfil | PRD (cuenta) | ✅ `login`, `registro`, `perfil` |
| RF-23 | Bloquear turnos/días, fijas, agenda, precio (personal) | PRD §6 | ⚠️ sólo la **agenda del día** (con contacto y ausentes); faltan bloqueos, reservas fijas y precio (la API los soporta) |
| RF-24 | Subir fotos del estado de una cancha | PRD (capacidades) | ⚠️ se guarda **sólo en el teléfono** |

## 4. Requisitos no funcionales

| ID | Requisito | Cómo se atiende |
|---|---|---|
| RNF-01 | Funcionar sin conexión para ver reservas, QR y catálogo | Caché en SQLite: reservas (`mis_reservas_final.db`) y catálogo (`villaguay_deportes.db`); foto y video de la ficha en el teléfono |
| RNF-02 | Sesión segura | JWT en `expo-secure-store`; contraseñas con `scrypt` en el servidor |
| RNF-03 | Acceso restringido por rol | Guard global en la API (`GuardAutenticacion`) |
| RNF-04 | Imposibilidad de doble reserva | Índice único sobre la columna `ocupacion` |
| RNF-05 | Modo oscuro | `ThemeProvider` con paleta clara/oscura/sistema |
| RNF-06 | Reintentos seguros ante mala señal | `POST /reservas` idempotente (200 si ya la tenías) |
| RNF-07 | Portabilidad de motor de base de datos | Cuatro motores con el mismo código (columnas portables) |
| RNF-08 | Tolerancia a fallos de notificaciones | `Avisos` nunca rompe el pedido; error → log |
| RNF-09 | Reproducibilidad del entorno | Docker, `.env.example`, semillas relativas a "hoy" |

## 5. Decisiones de diseño heredadas del PRD

La cátedra dejó escritas las decisiones sobre los "huecos" del PRD
(`api-reservas-deportivas/docs/SPECIFICATION.md` §10). Las que más condicionan la app:

| Id | Decisión | Efecto en la app |
|---|---|---|
| D1 | Id de turno `tur-<espacioId>-<AAAAMMDD>-<HH>` (el del PRD no incluía el espacio) | `(tabs)/index.tsx` **desarma el id** para mostrar fecha y hora (`formatearTurno`) |
| D2 | QR = `VGY-<MMDD>-<HH>-<6 aleatorios>` | Es el valor que se dibuja como QR |
| D3 | El jugador no puede cancelar tarde; el encargado sí (y suma "tardía") | La app muestra el mensaje de error de la API (`CANCELACION_FUERA_DE_PLAZO`) en una alerta |
| D6 | Encargado: agenda, ingresos, ausentes, bloqueos. Administrador: además fijas y precios | El escáner y su ícono son sólo para personal; el resto de las pantallas del personal sigue pendiente |
| D7 | No hay interruptor de avisos: siempre se notifica | Para no recibir avisos de un espacio, se quita de favoritos |
| D8 | El último turno termina en `"24:00"` | La grilla muestra `inicio` (`substring(0,5)`) |
| D9 | "Mover" un turno = cancelar y reservar otro | Sin pantalla de "mover" |
| D10 | Ingreso desde 30 min antes hasta el fin; ausente desde 15 min después | Reglas del servidor |

## 6. Estrategia de construcción

### 6.1 Plan de módulos de la API (cátedra)

La API se construyó en módulos incrementales, cada uno con su informe en
`api-reservas-deportivas/docs/reports/`:

| Módulo | Contenido |
|---|---|
| M0 Base | Arquitectura común, registro con teléfono obligatorio |
| M1 Espacios | Deportes, espacios, filtros, detalle |
| M2 Grilla | Cruce de reservas + fijas + bloqueos (función pura, con TDD) |
| M3 Reservas | Reservar sin dobles reservas, mis reservas, cancelar, límite de tres |
| M4 Ingreso y agenda | Validar QR, ausentes, agenda del día |
| M5 Administración | Bloqueos (con cancelación y aviso), fijas, precios |
| M6 Favoritos y avisos | Favoritos; push por turno liberado y por suspensión |
| M7 Nube | Archivos en S3-compatible, bases administradas, publicación en Render + Supabase |
| M8 Semillas y README | Datos de demo con casos "feos" |
| **M9 Notificaciones** | **Parte a completar por el grupo**: guardar tokens y enviar push |

### 6.2 Plan de la app (reconstruido)

El PRD fija una regla de arquitectura para la app que se respetó en lo esencial: **ninguna
pantalla habla directamente con la red; todo pasa por una capa de servicios asíncronos**
(`src/servicios/`). La secuencia natural de trabajo, visible en el código, fue:

| Fase | Entregable | Evidencia en el repo |
|---|---|---|
| 1. Base | Proyecto Expo, tipos del PRD, navegación por pestañas, tema claro/oscuro | `tipos/index.ts`, `(tabs)/_layout.tsx`, `ThemeProvider` |
| 2. Datos simulados | Datos falsos tipados con los tipos del PRD | `src/mocks/datos.ts` (hoy sin uso: se reemplazó por la API) |
| 3. Catálogo | Listado, filtros, ficha, video, galería | `espacios.tsx`, `espacio/[id].tsx` |
| 4. Disponibilidad y reserva | Grilla de 7 días, confirmación, QR | `disponibilidad.tsx`, `confirmar.tsx` |
| 5. Sesión | Registro, ingreso, perfil, SecureStore | `AuthContext`, `login`, `registro`, `perfil` |
| 6. Mis reservas + offline | Próximas/historial, cancelación, caché SQLite | `(tabs)/index.tsx` |
| 7. Capacidades nativas | Cámara/QR, biometría, háptica, mapa, ubicación, galería | `escaner.tsx`, `mapa.tsx`, `index.tsx` |
| 8. Conexión a la API real | `fetch` con sobre `{datos}` y token | `servicios/reservas.ts`, `servicios/auth.ts` |
| 9. Notificaciones push | Token real, alta/baja, toque → pantalla | `servicios/notificaciones.ts`, `_layout.tsx`, módulo de dispositivos |

### 6.3 Reparto de tareas y cronograma (COMPLETAR)

| Integrante | Responsabilidad | Fechas |
|---|---|---|
| `COMPLETAR` | `COMPLETAR` | `COMPLETAR` |
| `COMPLETAR` | `COMPLETAR` | `COMPLETAR` |
| `COMPLETAR` | `COMPLETAR` | `COMPLETAR` |

## 7. Riesgos identificados y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación / estado |
|---|---|---|---|
| El PRD tiene huecos | Alta | Medio | La cátedra documentó 12 decisiones (D1–D12); consultar `DECISIONS.md` |
| Cruce de reservas, fijas y bloqueos incorrecto ("donde se decide si la app sirve") | Media | Alto | Función pura `armarGrilla` con tests; la lógica vive en el servidor, no en la app |
| Doble reserva por pedidos simultáneos | Media | Alto | Índice único + test de dos `POST` simultáneos en los 4 motores |
| Mala señal en la puerta de la cancha | Alta | Alto | Caché local de reservas/QR; `POST /reservas` idempotente |
| La IP de la API cambia de red en red | Alta | Medio | `EXPO_PUBLIC_API_URL` en `.env.local` (cada integrante la suya) / API publicada |
| Push remotas en Android no andan en Expo Go | Alta | Medio | Development build / build de EAS |
| Dependencias de nube gratis (Render se duerme, Supabase pausa) | Media | Bajo | La app muestra estado de carga; documentado en el README de la API |
| Alcance del PRD mayor que lo implementado | Alta | Medio | Ver trazabilidad y plan de cierre en [08](08-estado-actual-y-deuda-tecnica.md) |

## 8. Trazabilidad: capacidades del dispositivo exigidas por el PRD

| Capacidad (PRD) | Paquete | Dónde se usa | Estado |
|---|---|---|---|
| Cámara (QR) | `expo-camera` | `(tabs)/escaner.tsx` | ✅ |
| Galería | `expo-image-picker` | `espacio/[id].tsx` | ✅ (se guarda sólo en el teléfono) |
| Ubicación y mapa | `expo-location` + `react-native-maps` | `(tabs)/mapa.tsx` | ✅ (en builds de Android requiere `GOOGLE_MAPS_API_KEY`) |
| Notificaciones | `expo-notifications` | `servicios/notificaciones.ts`, `_layout.tsx` | ✅ push y recordatorio local |
| Persistencia y red | `expo-sqlite`, `kv-store`, `expo-network` | `(tabs)/index.tsx`, `espacio/[id].tsx`, `servicios/db.ts`, `servicios/*` | ✅ SQLite (reservas y catálogo) y red · `kv-store` sólo en `servicios/db.ts` (sin uso real) |
| Seguridad | `expo-secure-store`, `expo-local-authentication` | `AuthContext`, `app/index.tsx`, `escaner.tsx` | ✅ |
| Háptica / sensores | `expo-haptics`, `expo-sensors` | `app/index.tsx`, `escaner.tsx` | ✅ háptica · ❌ sensores sin uso |
| Sistema de archivos | `expo-file-system` | `servicios/archivos.ts`, `espacio/[id].tsx` | ✅ copia local de foto y video (API nueva `File`/`Paths`) |
| Multimedia | `expo-video` | `espacio/[id].tsx` | ✅ |
