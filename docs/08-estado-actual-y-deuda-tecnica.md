# 08 · Estado actual y deuda técnica

Este documento es **honesto a propósito**: conviene que el grupo conozca sus puntos débiles
*antes* de la defensa, no durante. Cada hallazgo tiene un identificador (`B-xx` = error,
`G-xx` = brecha respecto del PRD, `D-xx` = deuda técnica), dónde está y cómo arreglarlo.
Todos se verificaron leyendo el código; los que dependen de un teléfono real se marcan
*(a confirmar en dispositivo)*.

## 0. Resumen del estado final

| Lista | Total | ✅ Resueltos | ⚠️ Parciales / aclarados | ✋ Aceptados | ⏳ Pendientes |
|---|---|---|---|---|---|
| Errores (`B-xx`) | 17 | 14 (B-01 a B-07, B-09, B-10, B-11, B-14 a B-17) | 0 | 3 (B-08, B-12, B-13) | 0 |
| Brechas del PRD (`G-xx`) | 10 | 9 (G-01 a G-08, G-10) | 1 (G-09) | 0 | 0 |
| Deuda técnica (`D-xx`) | 19 | 8 (D-01, D-02, D-08 a D-11, D-13, D-16) | 4 (D-03, D-04, D-06, D-07) | 1 (D-15) | 6 (D-05, D-12, D-14, D-17, D-18, D-19) |

**Acordado con la cátedra:** se entrega un **build `preview`** y la demostración es en **Expo Go**, con la
**API local**; no se publica nada, el reporte de foto puede quedar en el teléfono y los sensores son
opcionales.

**Lo que realmente queda pendiente, en orden de importancia para la entrega:**

1. **G-09 · Generar el build `preview`:** `eas init` y `eas build --platform android --profile preview`
   (hace falta una cuenta de Expo). Nada más es obligatorio: el APK habla con la API local por `http`
   (se habilita en `preview`) y la dirección se elige en la app. Las credenciales de push y la clave de
   Google Maps son **opcionales** (sin ellas: sin push remotas y lista de complejos en lugar del mapa).
   Ver el [README §5](../README.md).
2. **D-14 · `pnpm-lock.yaml` de la API desactualizado:** hay que correr `pnpm install` y commitearlo
   o el CI de la API falla.
3. **D-18 · Íconos y pantalla de inicio** de la plantilla de Expo.
4. El resto es calidad interna (exceso de `any`, estilos repetidos, tres bases SQLite, la ruta
   `/` ambigua, límites de las pantallas del personal) y no afecta lo que ve el usuario.

## 1. Lo que funciona bien (fortalezas para destacar)

- **Arquitectura limpia en dos capas:** pantallas → servicios → API; tipos del PRD compartidos.
- **El cruce de reservas, fijas y bloqueos lo resuelve el servidor**, con reglas puras probadas;
  la app sólo dibuja estados.
- **Imposibilidad de doble reserva** garantizada en la base (índice único), no en la interfaz.
- **Modo sin conexión real** para "Mis reservas" y el QR (SQLite), con aviso visual.
- **Seguridad razonable:** token en `SecureStore`, huella/PIN, contraseñas con `scrypt`.
- **Notificaciones push de punta a punta**, con alta/baja del token, limpieza de tokens
  inválidos y navegación al tocar el aviso.
- **Uso de muchas capacidades nativas** (cámara, ubicación, biometría, háptica, galería,
  video, SQLite, notificaciones, red) integradas en flujos con sentido.
- **Tema claro/oscuro** (se recuerda entre sesiones) y estados de carga/vacío/error en las pantallas principales.
- **Pantallas de administración completas** (agenda con ausentes, bloqueos con aviso previo de reservas afectadas, reservas fijas y precios), limitadas por rol en la interfaz y en la API.
- **215 pruebas automáticas** de la app, comprobadas introduciendo errores a propósito, más las de la API; CI en la raíz del repositorio.
- **Documentación verificada contra el código:** cada ruta y función citada existe (auditoría automática) y los pasos del README se siguieron desde una copia limpia.

## 2. Errores conocidos

### B-01 · Los mensajes de error de la API se muestran como `[object Object]` — **alta** ✅ RESUELTO

> **Resuelto:** `servicios/errores.ts` (`ErrorDeApi`, `lanzarSiError`) y todos los servicios lo usan; las pantallas muestran el `mensaje` de la API. Al fallar el turno, `confirmar.tsx` ofrece volver a la grilla.

- **Dónde:** `servicios/reservas.ts` → `crearReserva`, `alternarFavoritoApi`.
- **Causa:** la API responde `{ error: { codigo, mensaje } }`, pero el código hace
  `new Error(errorData.message || errorData.error || '…')`. `errorData.error` es un **objeto**
  (truthy), así que `Error` lo convierte a texto: `"[object Object]"`. Sólo `cancelarReserva`
  lee bien `errorData.error?.mensaje`.
- **Efecto:** al reservar un turno ocupado, superar el límite de 3 o fallar un favorito, la
  alerta muestra "Error del servidor — [object Object]" en lugar de "Ese turno ya fue
  reservado." *(deducido del código; a confirmar en dispositivo)*.
- **Otros servicios** leen `error.message` (que no existe en este formato) y caen en un texto
  genérico: `obtenerTurnosEspacio`, `actualizarPerfilApi`, `iniciarSesionApi`.
- **Arreglo (S):** un único helper y usarlo en todas las funciones.

```ts
// servicios/errores.ts
export const mensajeDeError = async (respuesta: Response, porDefecto: string) => {
  const cuerpo = await respuesta.json().catch(() => null);
  return cuerpo?.error?.mensaje ?? porDefecto;   // mensaje listo para mostrar
};
export const codigoDeError = async (respuesta: Response) =>
  (await respuesta.clone().json().catch(() => null))?.error?.codigo as string | undefined;

// uso
if (!respuesta.ok) throw new Error(await mensajeDeError(respuesta, 'Error al crear la reserva'));
```

### B-02 · La grilla calcula "hoy" en UTC: de noche, los días se corren — **alta** ✅ RESUELTO

> **Resuelto:** `aFechaLocal()` en `disponibilidad.tsx` arma la fecha con los componentes locales.

- **Dónde:** `app/espacio/disponibilidad.tsx` → `generarProximosDias()`.
- **Causa:** `fecha.toISOString().split('T')[0]` devuelve la fecha **en UTC**. Argentina es
  UTC−3: entre las **21:00 y las 24:00** locales, UTC ya es el día siguiente.
- **Efecto:** el botón "Hoy" pide los turnos de **mañana**; el séptimo día es hoy+7, que la API
  rechaza con `FECHA_FUERA_DE_RANGO` (la grilla queda vacía: "No hay turnos disponibles").
  Justo es la franja en que más se usa la app (el PRD: "se usa de noche").
- **Arreglo (S):** formatear con los componentes locales.

```ts
const aIso = (f: Date) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
// …
dias.push({ iso: aIso(fecha), nombre: …, numero: fecha.getDate() });
```

### B-03 · El escáner no registra el ingreso (simulado) y no controla el rol — **alta** ✅ RESUELTO

> **Resuelto:** `registrarIngresoApi` llama a `POST /ingresos`; el escáner y el ícono QR sólo están disponibles para encargado/administrador y muestran el mensaje de la API.

- **Dónde:** `servicios/reservas.ts#registrarIngresoApi` (devuelve datos falsos tras 500 ms);
  `(tabs)/escaner.tsx` (accesible para cualquiera por el ícono QR).
- **Efecto:** cualquier código "autoriza" el ingreso con vibración de éxito; los errores del
  PRD ("el código no es de hoy / de esta cancha") **nunca aparecen**. Un jugador o invitado
  puede abrir el escáner.
- **Arreglo (M):** llamar a `POST /ingresos` con `{ codigoQr, espacioId }` y token; mostrar
  `error.mensaje` (ya trae "Esa reserva no es para hoy.", "Esa reserva es para otra cancha."…);
  mostrar el ícono QR y permitir la ruta sólo si `usuario?.rol` es `encargado` o
  `administrador`.

### B-04 · La caché de imagen/video usa la API vieja de `expo-file-system` y no funciona — **media** ✅ RESUELTO

> **Resuelto:** `servicios/archivos.ts` usa `File`/`Paths` de la API nueva; la ficha usa la copia local si existe y descarga el resto en segundo plano (ya no demora la pantalla). A confirmar en un teléfono.

- **Dónde:** `app/espacio/[id].tsx` → `cargarDetalle()`.
- **Causa:** usa `FileSystem.documentDirectory`, `getInfoAsync` y `downloadAsync`. En
  `expo-file-system` 57 esos miembros ya no están en el export principal: `getInfoAsync`
  **lanza error** en ejecución (lo avisa el propio PRD) y `documentDirectory` queda
  `undefined`, por lo que la función retorna antes de cachear (el `as any` esconde el error al
  compilador).
- **Efecto:** el requisito "guardar el video y las fotos de cada cancha para verlos sin datos"
  **no se cumple**; la imagen y el video se piden siempre por red.
- **Arreglo (M):** la API nueva (`Paths`, `File`, `Directory`):

```ts
import { File, Paths } from 'expo-file-system';
const destino = new File(Paths.document, `esp_vid_${id}.mp4`);
if (!destino.exists) await File.downloadFileAsync(vidUrl, destino);
setVideoCache(destino.uri);
```
  (Verificar la firma exacta en la documentación del SDK 57.)

### B-05 · Credenciales de demo precargadas, con la contraseña mal escrita — **media** ✅ RESUELTO

> **Resuelto:** los campos de `app/index.tsx` arrancan vacíos.

- **Dónde:** `app/index.tsx`: `useState('emiliano@mail.com')` y `useState('Villaguay2026')`.
- **Efecto:** la contraseña real es `villaguay2026` (minúscula): el primer ingreso **falla**. Y
  son credenciales escritas en un repositorio público.
- **Arreglo (S):** dejar ambos campos vacíos (usar `__DEV__` si se quiere conservar el atajo).

### B-06 · Texto fijo "hasta las 15:00 de hoy" en cada reserva — **media** ✅ RESUELTO

> **Resuelto:** `plazoDeCancelacion()` usa `cancelableHasta`; si ya venció, oculta el botón y avisa.

- **Dónde:** `(tabs)/index.tsx` (aviso bajo "Cancelar reserva").
- **Causa:** es un texto literal copiado del wireframe del PRD; la API ya entrega
  `cancelableHasta` en cada reserva.
- **Arreglo (S):** formatear `item.cancelableHasta` (hora local) y, si ya pasó, deshabilitar el
  botón y mostrar "Avisale al encargado".

### B-07 · Siempre se reserva por la capacidad total — **media** ✅ RESUELTO

> **Resuelto:** selector de personas (1 a la capacidad) en `confirmar.tsx`.

- **Dónde:** `espacio/confirmar.tsx` → `crearReserva(turnoId, espacio?.capacidad || 10)`.
- **Efecto:** no se pregunta "cuántos van a ser" (PRD §3). Una cancha de fútbol 5 queda
  reservada "para 10".
- **Arreglo (S):** un selector (− / +) con mínimo 1 y máximo `espacio.capacidad`.

### B-08 · `calcularEstadoVisual` compara sólo la hora — **baja** ✋ SE ACEPTA

> **Decisión:** no se corrige. El comportamiento coincide con el del servidor (un turno que ya empezó no se puede reservar: `TURNO_PASADO`), y la única diferencia posible es un teléfono con la hora mal puesta; el servidor sigue siendo la fuente de verdad.

- Un turno de las 14:00 pasa a "Finalizado" a las 14:00 en punto (ya empezó, el servidor
  también lo rechaza con `TURNO_PASADO`: es coherente), pero la lógica ignora los minutos y
  usa el reloj del teléfono, que puede estar desajustado. El servidor es la fuente de verdad.

### B-09 · El tema elegido no se guarda — **baja** ✅ RESUELTO

> **Resuelto:** `ThemeProvider` guarda el modo en `expo-sqlite/kv-store` (clave `modoTema`) y lo lee de forma síncrona al arrancar. Cubierto por `__tests__/tema.test.tsx`.

- `ThemeProvider` mantiene `modoManual` sólo en memoria. **Arreglo (S):** guardarlo con
  `expo-sqlite/kv-store` (para lo que el PRD prevé) y leerlo al montar.

### B-10 · La sesión nunca se valida: un token vencido no se detecta — **media** ✅ RESUELTO

> **Resuelto:** cuando la API responde `NO_AUTENTICADO`, el `AuthContext` cierra la sesión, avisa y vuelve al ingreso (`sesionVencida`).

- El token dura 30 días. La app lo carga al arrancar y asume que sirve; cuando venza, los
  pedidos devolverán `NO_AUTENTICADO` y las pantallas mostrarán listas vacías sin explicar.
- **Arreglo (M):** en el helper de errores, si el código es `NO_AUTENTICADO`, llamar a
  `logout()` y llevar a `/login`.

### B-11 · El catálogo no funciona sin conexión — **media** ✅ RESUELTO

> **Resuelto:** `obtenerEspacios`, `obtenerEspacioPorId` y `obtenerDeportes` guardan el catálogo en SQLite (`servicios/db.ts`) y lo devuelven si no hay conexión.

- Sólo "Mis reservas" tiene caché. `obtenerEspacios()` sin red devuelve `[]` (traga el error) y
  el catálogo, la ficha y el mapa quedan vacíos. El PRD pide "catálogo de espacios" en SQLite.
- **Arreglo (M):** usar `servicios/db.ts` (ya escrito: `guardarEspaciosEnTelefono` /
  `leerEspaciosDelTelefono`) desde `obtenerEspacios()`: si hay red, guardar; si no, leer.

### B-12 · "Reportar" no sube nada a la API — **media** ✋ SE ACEPTA

> **Decisión:** la cátedra confirmó que es **aceptable** que el reporte de foto quede en el teléfono. La foto de la ficha se guarda sólo ahí porque la API **no tiene un endpoint para asociar una foto a un espacio** (`POST /archivos` sube un archivo genérico, pero nadie más lo vería). La alerta ahora dice "Foto guardada · Quedó guardada en este teléfono." en lugar de "¡Reporte subido!", que era engañoso. Quedaría como mejora de la API.

- La galería de `espacio/[id].tsx` guarda en SQLite **local** y dice "¡Reporte subido!";
  la pantalla `estado-cancha.tsx` (ya eliminada) sólo mostraba un `Alert`. La API tiene `POST /archivos`
  (multipart, campo `archivo`) listo para esto.
- **Arreglo (M):** subir con `FormData` y guardar la `url` devuelta; mostrar las URLs de todos.

### B-13 · Toques del aviso "Reserva cancelada" no llevan a la reserva — **baja** ✋ SE ACEPTA

> **Decisión:** no se corrige: no existe una pantalla de detalle de una reserva. El aviso lleva a "Mis reservas", donde está la lista y el QR.

- Va a la pestaña Mis Reservas (no existe pantalla de detalle de una reserva).

### B-14 · "Mis reservas" creía estar sin conexión en una wifi sin internet — **alta** ✅ RESUELTO

- **Dónde:** `(tabs)/index.tsx`, que sólo usaba la API si `isConnected && isInternetReachable`.
- **Causa:** en Android, `isInternetReachable` es falso cuando la red no tiene salida a internet aunque
  haya conexión (según la documentación de `expo-network`). En la demo, con la API en una notebook y
  una wifi sin internet, la pantalla mostraba el caché viejo y nunca las reservas reales. Además, si
  la API fallaba estando "conectado", tampoco caía al caché.
- **Se encontró** al preparar la lista de pruebas en teléfono real (`PENDIENTES.md`).

> **Resuelto:** `servicios/misReservas.ts` decide sólo con `isConnected`, y cae a lo guardado si la API
> falla; los errores de sesión se relanzan. Cubierto por `__tests__/misReservas.test.ts` (verificado
> reintroduciendo el error). Caso manual T-60.

### B-15 · Las reservas guardadas en el teléfono no se borraban al cerrar sesión — **alta** ✅ RESUELTO

- **Dónde:** el caché de "Mis reservas" (`mis_reservas_final.db`) es del teléfono, no de la cuenta, y
  `logout` no lo borraba.
- **Efecto:** quien ingresaba después en el mismo teléfono, sin conexión, veía las reservas (con su QR)
  de la cuenta anterior.

> **Resuelto:** `limpiarSesion` (usada por el logout y por la sesión vencida) llama a
> `borrarCacheReservas()`; un fallo al borrar no impide cerrar sesión. Cubierto por
> `__tests__/AuthContext.test.tsx`. Caso manual T-61.

### B-16 · El APK de preview no podía hablar con una API local — **alta** ✅ RESUELTO

- **Dónde:** `app.json` / `eas.json` / `servicios/config.ts`.
- **Causa:** con la entrega acordada (un APK de **preview** y la **API local**, sin publicar), la
  dirección de la API estaba grabada al compilar (`EXPO_PUBLIC_API_URL`) y un build de producción de
  Android e iOS **bloquea `http://`**. El APK habría quedado sin poder conectarse a la notebook, cuya IP
  además cambia de una red a otra. La documentación anterior pedía publicar la API con `https`.

> **Resuelto:** (1) la dirección se **elige desde la app** (cuadro *Servidor*, guardado en `kv-store`,
> con `Probar` y `Guardar`); (2) en los perfiles `preview` y `development`, `app.config.js` habilita
> `http` a la red local (`usesCleartextTraffic` en Android, `NSAllowsLocalNetworking` en iPhone) y en
> `production` queda bloqueado (verificado con `expo config --type introspect` en los tres perfiles).
> Cubierto por `config`, `servidor` y `selectorServidor` (verificado reintroduciendo errores).

### B-17 · El mapa podía cerrar la app en un APK sin clave de Google — **media** ✅ RESUELTO

- **Dónde:** `(tabs)/mapa.tsx` en un build de Android.
- **Causa:** sin `GOOGLE_MAPS_API_KEY`, el plugin de `react-native-maps` **quita** la clave del manifiesto de
  Android (se comprobó en su código y con `expo config`), y el SDK de mapas no puede dibujar (según
  su comportamiento conocido, puede cerrar la app). Como el APK de preview es lo que se entrega, no se
  podía depender de que alguien consiga la clave.

> **Resuelto:** `mapaDisponible()` (`servicios/mapa.ts`) detecta ese caso y la pantalla muestra una
> **lista de complejos** con distancia y "Cómo llegar" en lugar del mapa. En Expo Go y en iPhone el mapa
> sigue funcionando sin clave. Cubierto por `mapa.test.ts`. **A confirmar en un APK real** (caso B-08).

## 3. Brechas respecto del PRD

| ID | Requisito (PRD) | Estado | Esfuerzo |
|---|---|---|---|
| G-01 | Registro real del ingreso con QR (§4) | ✅ Resuelto (llama a `POST /ingresos`) | — |
| G-02 | Marcar "no se presentó" (§4) | ✅ Resuelto: pantalla **Agenda del día** (`agenda.tsx`) | — |
| G-03 | **Recordatorio 2 h antes** (§5) | ✅ Resuelto (notificación local; a confirmar en un teléfono) | — |
| G-04 | ✅ Pantallas del personal (§6): bloqueos, fijas, agenda, precio | Resuelto: **Agenda del día**, **Bloqueos**, **Reservas fijas** y **Precios** | — |
| G-05 | ✅ Distinguir roles en la interfaz (D6) | Resuelto: escáner, agenda y bloqueos para el personal; reservas fijas y precios sólo para el administrador | — |
| G-06 | Guardar fotos/video para verlos sin datos (§capacidades) | ✅ Resuelto (B-04) | — |
| G-07 | ✅ `expo-sensors` y `kv-store` | Resuelto por decisión de la cátedra: los **sensores son opcionales** y el **GPS** (`expo-location`) ya se usa en el mapa (distancia y complejo más cercano). `kv-store` guarda el tema y la dirección del servidor. `expo-sensors` sigue instalado sin uso | — |
| G-08 | ✅ `react-native-maps` (PRD) | Resuelto: el mapa pasó de Leaflet en un `WebView` a `react-native-maps` (y se quitó `react-native-webview`). Pendiente de la entrega: la clave de Google Maps para los builds de Android | — |
| G-09 | ⚠️ Build con EAS (Entrega) | Configuración lista (`eas.json`, nombre, identificador, permisos, `http` a la red local en `preview`). **Se entrega un build `preview`** (no hay que publicar). Falta generarlo: `eas init` y `eas build -p android --profile preview` (cuenta de Expo). Push y clave de Google Maps son opcionales | S |
| G-10 | ✅ Mostrar el precio por turno y el motivo del bloqueo en la grilla | Resuelto: los turnos libres muestran su precio, el mantenimiento su motivo y una reserva fija dice "Fijo" (como el wireframe del PRD) | — |

### Cómo implementar el recordatorio de 2 horas (G-03)

Es una notificación **local**: la programa el teléfono, no el servidor (regla R22).

```ts
// servicios/notificaciones.ts
export const programarRecordatorio = async (reserva: Reserva, nombreEspacio: string) => {
  const inicio = inicioDelTurno(reserva.turnoId);              // desarmar tur-esp-02-AAAAMMDD-HH
  const cuando = new Date(inicio.getTime() - 2 * 60 * 60 * 1000);
  if (cuando.getTime() <= Date.now()) return null;             // falta menos de 2 h
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Tu turno es en 2 horas', body: `${nombreEspacio} · ${hora}`, data: { reservaId: reserva.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: 'default' },
  });
};
// Guardar el id devuelto y llamar a cancelScheduledNotificationAsync(id) al cancelar la reserva.
```

Dónde engancharlo: en `confirmar.tsx` tras `crearReserva` y en `index.tsx` tras
`cancelarReserva`; al iniciar sesión conviene reprogramar las próximas reservas.

## 4. Deuda técnica

| ID | Tema | Detalle | Esfuerzo |
|---|---|---|---|
| D-01 | ✅ **IP de la API** | Resuelto: `servicios/config.ts` lee `EXPO_PUBLIC_API_URL` (`.env.local`) | — |
| D-02 | ✅ Servicios simulados | Resuelto: se eliminaron `obtenerComplejosApi` y `obtenerMisReservasApi`; `registrarIngresoApi` es real | — |
| D-03 | ⚠️ Funciones duplicadas | Parcial: se eliminó `obtenerTurnosPorDia`; los filtros del catálogo siguen en el cliente | S |
| D-04 | ⚠️ Capas saltadas | Parcial: la ficha usa `servicios/archivos.ts`, el catálogo `servicios/db.ts` y "Mis reservas" `servicios/cacheReservas.ts`. Sigue abriendo su propia base la galería de la ficha | M |
| D-05 | Mucho `any` | `useState<any[]>`, `catch (error: any)`, `ThemeContext = createContext<any>`; usar los tipos del PRD | M |
| D-06 | ⚠️ Varias bases SQLite | Parcial: se eliminó la paleta sin uso (`theme/colors.ts`). Siguen tres bases (`mis_reservas_final.db`, `canchas_galeria.db`, `villaguay_deportes.db`): unificarlas es opcional | S |
| D-07 | ⚠️ Acoplamiento al formato del id de turno | Parcial: el desarmado está en un solo lugar (`servicios/turnos.ts`); sigue dependiendo del formato | S |
| D-08 | ✅ Código muerto y copias de respaldo | Resuelto: se eliminaron los `.txt`, `useLogin.ts` y la plantilla de Expo. Se conserva `mocks/datos.ts` como evidencia de la fase de datos simulados | — |
| D-09 | ✅ La app no compilaba limpio con `tsc` | Resuelto: `npx tsc --noEmit` termina sin errores | — |
| D-10 | ✅ Dependencias sin uso | Resuelto: se quitaron `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `@expo/ui`, `expo-glass-effect`, `expo-status-bar`, `expo-symbols` y el `package.json` de la raíz. Se conserva `expo-sensors` (G-07) | — |
| D-11 | ✅ Pantalla `estado-cancha.tsx` huérfana | Resuelto: se eliminó | — |
| D-12 | Ruta `/` ambigua | `app/index.tsx` y `app/(tabs)/index.tsx` | S |
| D-13 | ✅ Sin tests de la app | Resuelto en lo esencial: **215 pruebas automáticas** (lógica, servicios, sesión, notificaciones, caché, componentes) y CI. Faltan las pruebas de render de pantallas completas y de navegación (ver [07 §4.6](07-pruebas-y-calidad.md)) | — |
| D-14 | Lockfile de la API desincronizado | `pnpm install` y commitear `pnpm-lock.yaml` (el CI usa `--frozen-lockfile`) | S |
| D-15 | `http://` en claro | Aceptable en desarrollo; para producción usar `https://` (Render) | — |
| D-16 | ✅ `Total a pagar` | Resuelto: ahora dice "Precio del turno" | — |
| D-19 | Límites de las pantallas del personal | Las reservas fijas no se pueden **editar** (sólo crear y dar de baja; la API tiene `PATCH /fijas/:id`) y un bloqueo cubre **un solo día** (para varios días hay que crear uno por día) | S |
| D-18 | Íconos y pantalla de inicio de la plantilla | `assets/images/icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png` son los de Expo; sin ícono de notificación propio (Android usa el del launcher) | S |
| D-17 | Estilos en línea con mucha repetición | Extraer componentes (`Boton`, `Tarjeta`, `Chip`) | M |

## 5. Plan de cierre recomendado (orden sugerido)

**Avance:** las prioridades **1 a 12 están hechas** (marcadas ✅ en la tabla de abajo; la 10 deja la configuración lista y el build depende de las cuentas del grupo). Lo que queda está en el resumen de arriba.

| Prioridad | Tarea | Resuelve |
|---|---|---|
| 1 ✅ | Helper de errores + usarlo en todos los servicios | B-01, B-10 |
| 2 ✅ | Fecha local en la grilla | B-02 |
| 3 ✅ | `POST /ingresos` real + control de rol del escáner | B-03, G-01, G-05 |
| 4 ✅ | Selector de cantidad de personas | B-07 |
| 5 ✅ | Texto de cancelación desde `cancelableHasta` | B-06 |
| 6 ✅ | Quitar credenciales precargadas | B-05 |
| 7 ✅ | Recordatorio local de 2 h | G-03 |
| 8 ✅ | Caché de espacios en SQLite + API nueva de archivos | B-11, B-04, G-06 |
| 9 ✅ | `config.ts` único para la URL de la API | D-01 |
| 10 ✅ | `eas.json`, nombre e identificador, permisos para iOS, `http` a la red local y **dirección del servidor elegible desde la app** (el build en sí necesita la cuenta de Expo: ver README §5) | G-09, B-16 |
| 11 ✅ | Limpieza (código muerto, dependencias, `tsc` limpio) | D-08…D-11 |
| 12 ✅ | Pantalla de ausentes y pantallas del personal (agenda, bloqueos, reservas fijas, precios) | G-02, G-04, G-05 |

> Si el tiempo es poco: las prioridades **1 a 4** son las que más se notan en una demostración.
