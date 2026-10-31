# 08 · Estado actual y deuda técnica

Este documento es **honesto a propósito**: conviene que el grupo conozca sus puntos débiles
*antes* de la defensa, no durante. Cada hallazgo tiene un identificador (`B-xx` = error,
`G-xx` = brecha respecto del PRD, `D-xx` = deuda técnica), dónde está y cómo arreglarlo.
Todos se verificaron leyendo el código; los que dependen de un teléfono real se marcan
*(a confirmar en dispositivo)*.

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
- **Tema claro/oscuro** y estados de carga/vacío/error en las pantallas principales.

## 2. Errores conocidos

### B-01 · Los mensajes de error de la API se muestran como `[object Object]` — **alta**

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

### B-02 · La grilla calcula "hoy" en UTC: de noche, los días se corren — **alta**

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

### B-03 · El escáner no registra el ingreso (simulado) y no controla el rol — **alta**

- **Dónde:** `servicios/reservas.ts#registrarIngresoApi` (devuelve datos falsos tras 500 ms);
  `(tabs)/escaner.tsx` (accesible para cualquiera por el ícono QR).
- **Efecto:** cualquier código "autoriza" el ingreso con vibración de éxito; los errores del
  PRD ("el código no es de hoy / de esta cancha") **nunca aparecen**. Un jugador o invitado
  puede abrir el escáner.
- **Arreglo (M):** llamar a `POST /ingresos` con `{ codigoQr, espacioId }` y token; mostrar
  `error.mensaje` (ya trae "Esa reserva no es para hoy.", "Esa reserva es para otra cancha."…);
  mostrar el ícono QR y permitir la ruta sólo si `usuario?.rol` es `encargado` o
  `administrador`.

### B-04 · La caché de imagen/video usa la API vieja de `expo-file-system` y no funciona — **media** *(a confirmar en dispositivo)*

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

### B-05 · Credenciales de demo precargadas, con la contraseña mal escrita — **media**

- **Dónde:** `app/index.tsx`: `useState('emiliano@mail.com')` y `useState('Villaguay2026')`.
- **Efecto:** la contraseña real es `villaguay2026` (minúscula): el primer ingreso **falla**. Y
  son credenciales escritas en un repositorio público.
- **Arreglo (S):** dejar ambos campos vacíos (usar `__DEV__` si se quiere conservar el atajo).

### B-06 · Texto fijo "hasta las 15:00 de hoy" en cada reserva — **media**

- **Dónde:** `(tabs)/index.tsx` (aviso bajo "Cancelar reserva").
- **Causa:** es un texto literal copiado del wireframe del PRD; la API ya entrega
  `cancelableHasta` en cada reserva.
- **Arreglo (S):** formatear `item.cancelableHasta` (hora local) y, si ya pasó, deshabilitar el
  botón y mostrar "Avisale al encargado".

### B-07 · Siempre se reserva por la capacidad total — **media**

- **Dónde:** `espacio/confirmar.tsx` → `crearReserva(turnoId, espacio?.capacidad || 10)`.
- **Efecto:** no se pregunta "cuántos van a ser" (PRD §3). Una cancha de fútbol 5 queda
  reservada "para 10".
- **Arreglo (S):** un selector (− / +) con mínimo 1 y máximo `espacio.capacidad`.

### B-08 · `calcularEstadoVisual` compara sólo la hora — **baja**

- Un turno de las 14:00 pasa a "Finalizado" a las 14:00 en punto (ya empezó, el servidor
  también lo rechaza con `TURNO_PASADO`: es coherente), pero la lógica ignora los minutos y
  usa el reloj del teléfono, que puede estar desajustado. El servidor es la fuente de verdad.

### B-09 · El tema elegido no se guarda — **baja**

- `ThemeProvider` mantiene `modoManual` sólo en memoria. **Arreglo (S):** guardarlo con
  `expo-sqlite/kv-store` (para lo que el PRD prevé) y leerlo al montar.

### B-10 · La sesión nunca se valida: un token vencido no se detecta — **media**

- El token dura 30 días. La app lo carga al arrancar y asume que sirve; cuando venza, los
  pedidos devolverán `NO_AUTENTICADO` y las pantallas mostrarán listas vacías sin explicar.
- **Arreglo (M):** en el helper de errores, si el código es `NO_AUTENTICADO`, llamar a
  `logout()` y llevar a `/login`.

### B-11 · El catálogo no funciona sin conexión — **media**

- Sólo "Mis reservas" tiene caché. `obtenerEspacios()` sin red devuelve `[]` (traga el error) y
  el catálogo, la ficha y el mapa quedan vacíos. El PRD pide "catálogo de espacios" en SQLite.
- **Arreglo (M):** usar `servicios/db.ts` (ya escrito: `guardarEspaciosEnTelefono` /
  `leerEspaciosDelTelefono`) desde `obtenerEspacios()`: si hay red, guardar; si no, leer.

### B-12 · "Reportar" no sube nada a la API — **media**

- La galería de `espacio/[id].tsx` guarda en SQLite **local** y dice "¡Reporte subido!";
  `estado-cancha.tsx` sólo muestra un `Alert`. La API tiene `POST /archivos`
  (multipart, campo `archivo`) listo para esto.
- **Arreglo (M):** subir con `FormData` y guardar la `url` devuelta; mostrar las URLs de todos.

### B-13 · Toques del aviso "Reserva cancelada" no llevan a la reserva — **baja**

- Va a la pestaña Mis Reservas (no existe pantalla de detalle de una reserva).

## 3. Brechas respecto del PRD

| ID | Requisito (PRD) | Estado | Esfuerzo |
|---|---|---|---|
| G-01 | Registro real del ingreso con QR (§4) | Simulado (B-03) | M |
| G-02 | Marcar "no se presentó" (§4) | Sin pantalla; la API lo tiene (`POST /reservas/:id/ausente`) | M |
| G-03 | **Recordatorio 2 h antes** (§5) | No implementado | M |
| G-04 | Pantallas del personal (§6): bloqueos, fijas, agenda, precio | No hay | L |
| G-05 | Distinguir roles en la interfaz (D6) | La app trata a todos como jugadores | M |
| G-06 | Guardar fotos/video para verlos sin datos (§capacidades) | No funciona (B-04) | M |
| G-07 | `expo-sensors` y `kv-store` | Instalados, sin uso real | S |
| G-08 | `react-native-maps` (PRD) | Se usó Leaflet en WebView (decisión consciente) | — |
| G-09 | Build de producción con EAS (Entrega) | No hay `eas.json`; `name: "my-app"`, `package: com.anonymous.myapp` | M |
| G-10 | Mostrar el precio por turno y el motivo del bloqueo en la grilla | La API los envía; la app no los muestra | S |

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
| D-01 | **IP de la API escrita a mano dos veces** | `BASE_URL` (`auth.ts`) y `API_URL` (`reservas.ts`). Unificar en un `config.ts` leyendo `process.env.EXPO_PUBLIC_API_URL` | S |
| D-02 | Tres servicios simulados sin uso | `obtenerComplejosApi`, `obtenerMisReservasApi` (y `registrarIngresoApi`, que sí se usa) | S |
| D-03 | Funciones duplicadas | `obtenerTurnosPorDia` ≡ `obtenerTurnosEspacio`; filtros en cliente aunque la API filtra | S |
| D-04 | Capas saltadas | Pantallas abren SQLite y `expo-file-system` directamente; `servicios/db.ts` sin uso | M |
| D-05 | Mucho `any` | `useState<any[]>`, `catch (error: any)`, `ThemeContext = createContext<any>`; usar los tipos del PRD | M |
| D-06 | Dos bases SQLite y dos paletas | `mis_reservas_final.db`, `canchas_galeria.db`, `villaguay_deportes.db` (sin uso); `theme/colors.ts` sin uso | S |
| D-07 | Acoplamiento al formato del id de turno | `formatearTurno` parte el id por `-`; mejor pedir `GET /reservas/:id` o agregar fecha/hora a la reserva guardada | M |
| D-08 | Código muerto y copias de respaldo | `*.txt` en `app/` y `servicios/`, `hooks/useLogin.ts`, `mocks/datos.ts`, plantilla de Expo | S |
| D-09 | La app no compila limpio con `tsc` | 5 errores en archivos de la plantilla (`useTheme`, `global.css`, `animated-icon.module.css`) | S |
| D-10 | Dependencias sin uso | `axios`, `zod`, `react-hook-form`, `@hookform/resolvers`, `react-native-maps`; y `package.json` en la raíz con las mismas | S |
| D-11 | Pantalla `estado-cancha.tsx` huérfana | Sin enlace desde ninguna parte | S |
| D-12 | Ruta `/` ambigua | `app/index.tsx` y `app/(tabs)/index.tsx` | S |
| D-13 | Sin tests de la app | Ver [07](07-pruebas-y-calidad.md) | L |
| D-14 | Lockfile de la API desincronizado | `pnpm install` y commitear `pnpm-lock.yaml` (el CI usa `--frozen-lockfile`) | S |
| D-15 | `http://` en claro | Aceptable en desarrollo; para producción usar `https://` (Render) | — |
| D-16 | `Total a pagar` en la confirmación | El PRD aclara que no se cobra en la app; cambiar a "Precio" | S |
| D-17 | Estilos en línea con mucha repetición | Extraer componentes (`Boton`, `Tarjeta`, `Chip`) | M |

## 5. Plan de cierre recomendado (orden sugerido)

| Prioridad | Tarea | Resuelve |
|---|---|---|
| 1 | Helper de errores + usarlo en todos los servicios | B-01, B-10 |
| 2 | Fecha local en la grilla | B-02 |
| 3 | `POST /ingresos` real + control de rol del escáner | B-03, G-01, G-05 |
| 4 | Selector de cantidad de personas | B-07 |
| 5 | Texto de cancelación desde `cancelableHasta` | B-06 |
| 6 | Quitar credenciales precargadas | B-05 |
| 7 | Recordatorio local de 2 h | G-03 |
| 8 | Caché de espacios en SQLite + API nueva de archivos | B-11, B-04, G-06 |
| 9 | `config.ts` único para la URL de la API | D-01 |
| 10 | `eas.json`, nombre y `package` definitivos, build de producción | G-09 |
| 11 | Limpieza (código muerto, dependencias, `tsc` limpio) | D-02…D-12 |
| 12 | Pantalla de ausentes y, si da el tiempo, pantallas de personal | G-02, G-04 |

> Si el tiempo es poco: las prioridades **1 a 4** son las que más se notan en una demostración.
