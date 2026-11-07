# Tareas pendientes del grupo

> **Estado al cierre:** el código de la app y la integración de notificaciones push en la API están
> terminados y verificados **en una computadora** (183 pruebas automáticas de la app, 302 + 25 + 1161
> de la API, bundles de Android e iOS, README seguido desde una copia limpia). Todo lo que figura
> acá **no se pudo hacer desde la computadora donde se desarrolló**, porque necesita: **cuentas**
> del grupo, **teléfonos reales**, **decisiones** del grupo o **datos** que sólo ustedes tienen.

---

## 0. Cómo usar este archivo

1. **Repartan las tareas:** escriban el nombre en la columna *Responsable* de la vista rápida (§1).
2. **Marquen** `[x]` en cada tarea cuando se cumpla su *"Listo cuando"* (no antes).
3. Hagan primero las de la **ruta crítica** (§1, columna *Orden*): algunas dependen de otras.
4. Si algo falla, anótenlo con la plantilla de la §6.3 y avisen al resto del grupo.

| Símbolo | Significado |
|---|---|
| 🔴 | **Bloqueante:** sin esto no se puede entregar o defender con tranquilidad |
| 🟡 | Recomendable: mejora mucho la entrega, pero no la impide |
| 🟢 | Opcional: sólo si sobra tiempo |
| **S / M / L** | Esfuerzo: **S** menos de 1 h · **M** de 1 a 3 h · **L** más de 3 h |

---

## 1. Vista rápida

| Orden | # | Tarea | Prior. | Esfuerzo | Necesita | Responsable | Estado |
|---|---|---|---|---|---|---|---|
| 1 | [P-01](#p-01) | Aplicar todas las entregas y subirlas al repositorio | 🔴 | M | Acceso al repo | | ☐ |
| 2 | [P-02](#p-02) | Regenerar y commitear los lockfiles | 🔴 | S | P-01 | | ☐ |
| 3 | [P-03](#p-03) | Comprobar que el CI de GitHub pasa | 🔴 | S–M | P-02 | | ☐ |
| 4 | [P-04](#p-04) | Completar los datos del grupo en la documentación | 🔴 | S | Los datos del grupo | | ☐ |
| 5 | [P-05](#p-05) | Que cada integrante tenga el entorno funcionando | 🔴 | M | Teléfono, wifi | | ☐ |
| 6 | [P-06](#p-06) | **Probar todo en teléfonos reales** | 🔴 | L | Teléfonos | | ☐ |
| 7 | [P-07](#p-07) | Decidir y preparar cómo se hace la demostración | 🔴 | S | Decisión D-A | | ☐ |
| 8 | [P-08](#p-08) | Publicar la API en internet (Render + Supabase) | 🟡 | M | Cuentas, D-A | | ☐ |
| 9 | [P-09](#p-09) | Generar el build con EAS | 🟡 | M | Cuenta Expo, P-08 | | ☐ |
| 10 | [P-10](#p-10) | Configurar las notificaciones push del build | 🟡 | M | Cuenta Firebase | | ☐ |
| 11 | [P-11](#p-11) | Clave de Google Maps para Android | 🟡 | S–M | Cuenta Google Cloud | | ☐ |
| 12 | [P-12](#p-12) | Íconos y pantalla de inicio propios | 🟡 | M | Diseño | | ☐ |
| 13 | [P-13](#p-13) | Preparar y ensayar la defensa | 🔴 | L | Todos | | ☐ |
| 14 | [P-14](#p-14) | Congelar la versión final | 🔴 | S | Todo lo anterior | | ☐ |

**Ruta crítica mínima** (si el tiempo es muy poco): **P-01 → P-02 → P-04 → P-05 → P-06 → P-07 → P-13**.
Con eso la app se puede mostrar y defender con Expo Go. P-08 a P-11 son para el build de producción.

---

## 2. Decisiones que tiene que tomar el grupo

Resuélvanlas **antes** de empezar las tareas que dependen de ellas.

### D-A · ¿Cómo se hace la demostración?

| Opción | Cómo es | Ventajas | Desventajas |
|---|---|---|---|
| **A. Expo Go + API en una notebook** (misma wifi) | La API corre en la computadora; el teléfono abre la app con Expo Go | La más simple y segura; no necesita cuentas ni build; mapa sin clave | **Android no recibe notificaciones push remotas** en Expo Go (desde Expo SDK 53). En iPhone sí. El recordatorio local de 2 h **no** depende de esto |
| **B. APK `preview` + API publicada** | Build de EAS instalado en el teléfono, hablando con la API en Render (https) | Es lo más parecido a "producción" y a lo que pide el PRD | Requiere P-08, P-09, P-10 y P-11 (cuentas de Expo, Render, Supabase, Firebase, Google Cloud) |
| **C. Development build + API en una notebook** | `eas build --profile development` en Android; Metro y la API corren en la computadora | Muestra push en **Android** sin publicar la API | Requiere cuenta de Expo y P-10; todo sigue dependiendo de la notebook |

**Recomendación:** hacer la demostración con la **opción A** (la de menor riesgo) y, si el docente
exige el *build de producción con EAS*, generar además la **opción B** como entregable. Para mostrar
push, usar un **iPhone con Expo Go** o la opción C. Decidan y anótenlo: ______________________

### D-B · ¿Se mantiene el identificador de la app?

El identificador es `com.villaguay.reservasdeportivas` (Android `package` e iOS `bundleIdentifier`
en `my-app/app.json`). **No se puede cambiar una vez publicada en Google Play.** Si prefieren otro
(por ejemplo con el dominio de la facultad), cámbienlo **antes del primer build de producción** y
creen el proyecto de Firebase (P-10) con ese mismo nombre. Decisión: ______________________

### D-C · Preguntas para el docente

Conviene confirmarlas por escrito (aula virtual o mail) para no depender de la memoria:

- [ ] ¿Se exige el **build de producción con EAS** en la entrega, o alcanza con mostrar la app en Expo Go?
- [ ] Si se exige, ¿hay que **publicar en Google Play** o alcanza con un APK instalable?
- [ ] ¿La entrega se hace con la **API de la cátedra publicada en Render** o con una API local?
- [ ] ¿Es aceptable que el **reporte de foto** de una cancha quede sólo en el teléfono? (la API no
      tiene un endpoint para asociar una foto a un espacio; ver B-12 en `docs/08`).
- [ ] El PRD lista `expo-sensors`: ¿se espera un uso concreto? (hoy no se usa; ver O-01).
- [ ] Formato de entrega de la documentación (repositorio, PDF, presentación).

---

## 3. Tareas bloqueantes y recomendables

<a id="p-01"></a>
### P-01 · Aplicar todas las entregas y subirlas al repositorio 🔴 · M

**Por qué:** los cambios llegaron en varios zips y hay archivos que hay que **borrar** a mano. Si
falta uno, el repositorio queda inconsistente.

**Pasos**

1. Descomprimir **en la raíz del repositorio**, **en este orden** (cada zip pisa lo anterior; si ya
   aplicaron algunos, sigan desde el siguiente; si dudan, apliquen todos otra vez, no hace daño):
   `cambios-notificaciones.zip` → `documentacion.zip` → `correcciones-1.zip` → … → `correcciones-10.zip`.
2. Borrar los archivos que ya no existen (desde la raíz del repo):

   ```bash
   git rm -r --ignore-unmatch package.json package-lock.json \
     my-app/scripts my-app/src/components my-app/src/constants my-app/src/theme \
     my-app/src/global.css my-app/src/hooks/use-color-scheme.ts my-app/src/hooks/use-color-scheme.web.ts \
     my-app/src/hooks/useLogin.ts my-app/src/servicios/notificaciones.txt \
     my-app/src/app/layout.txt "my-app/src/app/(tabs)/mapa.txt" "my-app/src/app/(tabs)/reservas.txt" \
     "my-app/src/app/(tabs)/estado-cancha.tsx" \
     my-app/assets/images/expo-badge-white.png my-app/assets/images/expo-badge.png \
     my-app/assets/images/expo-logo.png my-app/assets/images/logo-glow.png \
     my-app/assets/images/react-logo.png "my-app/assets/images/react-logo@2x.png" "my-app/assets/images/react-logo@3x.png" \
     my-app/assets/images/tutorial-web.png my-app/assets/images/tabIcons \
     api-reservas-deportivas/test/e2e/pending-devices.e2e-spec.ts \
     api-reservas-deportivas/test/verification/m9-notifications.e2e-spec.ts \
     api-reservas-deportivas/.github
   ```
3. Instalar y comprobar:

   ```bash
   cd my-app && npm install && npx tsc --noEmit && npm test      # 183 pruebas en verde
   cd ../api-reservas-deportivas && pnpm install && pnpm verificar
   ```
4. Commitear (los mensajes de commit sugeridos están en cada entrega) y `git push`.

**Listo cuando:** `git status` está limpio, `npm test` muestra **183 passed** y `pnpm verificar` termina sin errores.

---

<a id="p-02"></a>
### P-02 · Regenerar y commitear los lockfiles 🔴 · S

**Por qué:** `pnpm-lock.yaml` de la API estaba desactualizado respecto de su `package.json`
(`@types/jest`, `@types/node`). El CI usa `pnpm install --frozen-lockfile` y `npm ci`, que **fallan**
si el lockfile no coincide.

```bash
cd api-reservas-deportivas && pnpm install        # actualiza pnpm-lock.yaml
cd ../my-app && npm install                       # actualiza package-lock.json
git add api-reservas-deportivas/pnpm-lock.yaml my-app/package-lock.json
git commit -m "chore: actualizar los lockfiles"
```

**Listo cuando:** `pnpm install --frozen-lockfile` (en la API) y `npm ci` (en `my-app`) terminan sin error.

---

<a id="p-03"></a>
### P-03 · Comprobar que el CI de GitHub pasa 🔴 · S–M

**Por qué:** los workflows `.github/workflows/app.yml` y `api.yml` **nunca se ejecutaron en GitHub**
(se validó su sintaxis y se corrieron sus pasos en una computadora). Además, el CI original de la
cátedra estaba dentro de `api-reservas-deportivas/.github/`, donde GitHub **no lo ejecuta**.

1. Hacer `git push` y abrir la pestaña **Actions** del repositorio.
2. Esperar a **CI de la app** y **CI de la API** (la API tiene tres trabajos: `verificar`, `matriz`, `docker`).
3. Si algo falla, abrir el paso en rojo y leer el error. Causas probables:
   lockfile desactualizado (P-02), versión de Node/pnpm, o un servicio de la `matriz` que tardó en levantar.
4. Corregir, volver a hacer *push* y repetir.

**Listo cuando:** los dos workflows muestran ✅ en el último commit de `main`.

---

<a id="p-04"></a>
### P-04 · Completar los datos del grupo en la documentación 🔴 · S

Hay campos `COMPLETAR` (los datos sólo los tienen ustedes):

| Archivo | Qué completar |
|---|---|
| `README.md` (línea 8) | Nombres de los **integrantes** |
| `docs/01-planificacion-y-requerimientos.md` §6.3 | Tabla de **reparto de tareas y cronograma** real del grupo (quién hizo qué y cuándo) |
| `docs/09-guia-de-defensa.md` §4 | **Qué tema domina cada integrante** para la defensa |

Buscarlos con: `grep -rn "COMPLETAR\|<Nombre y apellido>" README.md docs/`

**Listo cuando:** el comando anterior no devuelve nada.

---

<a id="p-05"></a>
### P-05 · Que cada integrante tenga el entorno funcionando 🔴 · M

Cada persona que vaya a probar o a defender debe poder levantar todo en su computadora y su teléfono.

- [ ] **Node 24** (`nvm use` dentro de `api-reservas-deportivas/` usa su `.nvmrc`) y **pnpm** (`corepack enable`).
- [ ] **API:** `cp .env.example .env` → `pnpm db:reiniciar` → `pnpm dev`; abrir `http://localhost:3000/salud`.
- [ ] **App:** `cd my-app && npm install`; `cp .env.example .env.local` y poner **su IP**.
- [ ] **Reiniciar Expo con `npx expo start -c`.** ⚠️ Sin `-c`, la app **sigue con la IP anterior** (se comprobó).
- [ ] **Teléfono:** instalar **Expo Go** (versión compatible con SDK 57), misma wifi que la computadora.
- [ ] Firewall: permitir el puerto **3000** (Windows suele bloquearlo). Si la red aísla los equipos, usar el *hotspot* del teléfono.
- [ ] Iniciar sesión con `emiliano@mail.com` / `villaguay2026` (todo en minúscula).

**Listo cuando:** en el teléfono se ve el catálogo de 11 espacios y se puede iniciar sesión.
Si no: README §7 (*Problemas frecuentes*).

---

<a id="p-06"></a>
### P-06 · Probar todo en teléfonos reales 🔴 · L

**Por qué:** es **lo único que nadie pudo hacer**. Todo el código está probado con pruebas
automáticas y contra la API, pero **ninguna pantalla se vio en un teléfono**. Los errores que
aparecen primero en un teléfono real suelen ser de este tipo: permisos, teclado, navegación,
cámara, notificaciones.

**Paso 1 · Recorrido de humo (≈ 30–40 min).** Hacerlo **ya**, apenas termine P-05. Los casos están
descritos en `docs/07-pruebas-y-calidad.md §5`:

| Bloque | Casos | Quién |
|---|---|---|
| Jugador: ingresar, catálogo, grilla, reservar, QR | T-10, T-04, T-56, T-57, T-11, T-12 | |
| Cancelar y límites | T-14, T-15, T-16 | |
| **Sin conexión** (modo avión) y **wifi sin internet** | T-17, T-33, **T-60** | |
| **Privacidad entre cuentas** | **T-61** | |
| Mapa y ubicación | T-21, T-22, T-35, T-36 | |
| Encargado: escáner (necesita 2 teléfonos) | T-23, T-27 | |
| Encargado: agenda y ausentes | T-37, T-41, T-42 | |
| Encargado: bloqueo con aviso previo | T-45, T-46 | |
| Administrador: fijas y precios | T-50, T-51, T-53 | |
| Tema y recordatorio | T-20, T-58, T-31 | |
| Notificaciones push (iPhone, o development build) | N-01, N-02, N-04 | |

**Paso 2 · Plan completo.** Los **76 casos** del plan manual, repartidos entre los integrantes.
Registren cada resultado (§6.2).

**Paso 3 · Probar con la hora real.** Los casos **T-29** (grilla entre las 21 y las 24) y **T-41/T-42**
(ausente: hay que esperar 15 minutos desde el inicio del turno) dependen de la hora. Planifíquenlos.

**Listo cuando:** el recorrido de humo está completo, cada falla está anotada (§6.3) y las fallas
que bloquean la demostración están corregidas.

> En la §5 hay una lista de **lo primero que conviene mirar si algo falla**.

---

<a id="p-07"></a>
### P-07 · Decidir y preparar cómo se hace la demostración 🔴 · S

Según la decisión **D-A**:

- **Opción A (Expo Go):** dejar **una cuenta de jugador y una de encargado** ya probadas; la API
  corriendo en una notebook; los dos teléfonos en la misma wifi (o un *hotspot*); `npx expo start -c`
  ya hecho. Guion en `docs/09-guia-de-defensa.md §5`.
- **Opción B:** ver P-08 a P-11.
- **Opción C:** `eas build --platform android --profile development` y `npx expo start --dev-client`.

**Listo cuando:** el guion de la demostración se hizo completo **dos veces seguidas** sin fallas.

---

<a id="p-08"></a>
### P-08 · Publicar la API en internet (Render + Supabase) 🟡 · M

**Necesario para la opción B** (los builds de producción sólo aceptan `https://`, no una IP local).
Los pasos completos están en **`api-reservas-deportivas/README.md` §11** ("Publicar la API en
internet (Render + Supabase, gratis)"). Resumen: crear el proyecto de **Supabase** (base y archivos),
crear el servicio en **Render** con el *Blueprint* `render.yaml` y cargar las variables que pide.

Detalles que conviene saber:

- La capa gratuita de Render **se duerme** si nadie la usa: la primera respuesta tarda un rato.
  **Despiértenla minutos antes de la demostración** (abrir `https://TU-API.onrender.com/salud`).
- Para recibir push desde la API publicada, la variable debe ser **`NOTIFICACIONES=expo`**
  (el valor por defecto sólo escribe en la consola).
- Comprobar `https://TU-API.onrender.com/salud` y `https://TU-API.onrender.com/docs`.

**Listo cuando:** `/salud` responde en `https` y se puede iniciar sesión con `emiliano@mail.com` desde Swagger.

---

<a id="p-09"></a>
### P-09 · Generar el build con EAS 🟡 · M

Detalle completo en `README.md` §5. Resumen:

```bash
cd my-app
npm install -g eas-cli          # o: npx eas-cli <comando>
eas login                       # cuenta de expo.dev (gratis)
eas init                        # agrega extra.eas.projectId a app.json → COMMITEARLO
```

1. En `my-app/eas.json`, reemplazar `https://REEMPLAZAR-POR-LA-URL-DE-LA-API` por la URL de P-08
   en los perfiles `preview` y `production`. **Tiene que ser `https://`.**
2. `eas build --platform android --profile preview` → EAS entrega un enlace/QR para **instalar el APK**.
3. Instalar el APK en un teléfono y repetir el **recorrido de humo** (P-06), más los casos **B-01 a B-06**.
4. Para iPhone: `eas build --platform ios` requiere una **cuenta de Apple Developer (paga)**. Si no la
   tienen, se queda como "no probado en iOS" (y se aclara en la defensa).

**Listo cuando:** el APK instalado inicia sesión, muestra el catálogo y permite reservar contra la API publicada.

---

<a id="p-10"></a>
### P-10 · Configurar las notificaciones push del build 🟡 · M

Sin esto, el build **no recibe** push (aunque `NOTIFICACIONES=expo` esté bien en la API).

**Android**

1. Crear un proyecto en **Firebase** y agregar una app Android con el paquete **`com.villaguay.reservasdeportivas`** (o el de D-B).
2. Descargar **`google-services.json`**, ponerlo en `my-app/` y agregar en `app.json`, dentro de `android`:
   `"googleServicesFile": "./google-services.json"`.
3. Generar una **clave de cuenta de servicio FCM V1** y subirla a EAS con `eas credentials`
   (Android → Google Service Account → FCM V1).
4. **No commitear** la clave de cuenta de servicio.

**iPhone:** subir una **APNs key** a EAS (necesita cuenta de Apple Developer).

**Probar:** casos **N-01 a N-06** del plan (con el APK instalado e iniciada la sesión).

**Listo cuando:** `POST /dispositivos/prueba` (desde Swagger, con el token del usuario) hace llegar
"Notificación de prueba" al teléfono, y el bloqueo de un turno reservado (N-02) avisa al jugador.

---

<a id="p-11"></a>
### P-11 · Clave de Google Maps para Android 🟡 · S–M

Sin la clave, **en un build de Android el mapa no se dibuja** (en Expo Go y en iPhone no hace falta).
Detalle en `README.md` §5.4:

1. En **Google Cloud**: crear un proyecto y habilitar **Maps SDK for Android**.
2. Crear una **API key** y restringirla a apps Android con el paquete de D-B y el **SHA-1** del
   certificado de firma (aparece en *Credentials* del proyecto en expo.dev **después del primer build**).
3. Cargarla como variable de EAS **`GOOGLE_MAPS_API_KEY`** (dashboard de expo.dev → *Environment
   variables*, o `eas env:create`) para los entornos `preview` y `production`.
4. Hacer un nuevo build y probar **T-21, T-35 y T-36** en el APK.

> El orden importa: el SHA-1 sólo se conoce después de un primer build, así que habrá **dos builds**.

**Listo cuando:** en el APK se ve el mapa con los dos complejos y el botón "Cómo llegar" abre la ruta.

---

<a id="p-12"></a>
### P-12 · Íconos y pantalla de inicio propios 🟡 · M

Hoy son los de la plantilla de Expo (nombre del proyecto ya está bien: "Deportes Villaguay").
Reemplazar en `my-app/assets/images/` **manteniendo los nombres y las medidas**:

| Archivo | Medida actual | Uso |
|---|---|---|
| `icon.png` | 1024 × 1024 | Ícono principal (iOS y base) |
| `android-icon-foreground.png` | 512 × 512 | Primer plano del ícono adaptable de Android (dejar margen en los bordes) |
| `android-icon-background.png` | 512 × 512 | Fondo del ícono adaptable |
| `android-icon-monochrome.png` | 432 × 432 | Versión de una sola tinta (Android 13+) |
| `splash-icon.png` | 228 × 213 | Pantalla de inicio |
| `favicon.png` | 48 × 48 | Versión web |
| `my-app/assets/expo.icon` | — | Ícono de iOS (formato de *Icon Composer*): se puede reemplazar por `icon.png` quitando `ios.icon` de `app.json` |

**Opcional:** un **ícono de notificación** propio (Android): PNG de 96 × 96, **blanco sobre fondo
transparente**; luego en `app.json` → `["expo-notifications", { "color": "#208AEF", "icon": "./assets/images/notification-icon.png" }]`.
Sin él, Android usa el ícono del lanzador y puede verse como un cuadrado.

**Listo cuando:** el ícono y la pantalla de inicio del APK ya no son los de Expo.

---

<a id="p-13"></a>
### P-13 · Preparar y ensayar la defensa 🔴 · L

Todo el material está en `docs/09-guia-de-defensa.md`.

- [ ] **Repartir los temas** (§4 del documento 09): cada integrante domina uno **a fondo** y conoce los demás **a nivel general**.
- [ ] Cada uno **estudia** su parte en `docs/04`, `05`, `03` o `06` y **responde en voz alta** las preguntas de su tema (§6 del 09).
- [ ] Todos leen `docs/08-estado-actual-y-deuda-tecnica.md` **completo**, en especial el resumen (§0):
      conviene conocer los límites **antes** de que los descubra el docente.
- [ ] Todos leen `docs/00-indice.md §2`: **qué es de la cátedra y qué es del grupo** (la API y el PRD son de la cátedra; la app y las notificaciones, del grupo).
- [ ] **Ensayo completo con cronómetro:** guion de 5 minutos + demostración de 5–7 minutos, **al menos dos veces**, con todos presentes.
- [ ] **Plan B** por si falla la red o la API: capturas de pantalla, un **video corto** del recorrido completo, y los tests en verde (`npm test`, `pnpm test:notificaciones`).

**Checklist del día de la defensa**

- [ ] Teléfonos **cargados**, con Expo Go (o el APK) instalado y la sesión cerrada.
- [ ] Notebook con la API corriendo (`pnpm dev`) y `GET /salud` respondiendo; Render **despierto** si se usa.
- [ ] Misma wifi (o *hotspot*) y la **IP correcta** en `.env.local` + `npx expo start -c`.
- [ ] Cuentas de demo: `emiliano@mail.com` (jugador), `marcelo@villaguay.demo.ar` (encargado), `nahuel@villaguay.demo.ar` (administrador); contraseña `villaguay2026`.
- [ ] Base **reiniciada** justo antes (`pnpm db:reiniciar`) para tener datos de demo limpios.
- [ ] Si se muestra push: `NOTIFICACIONES=expo` en el `.env` y el teléfono con permiso concedido.

**Listo cuando:** todos pueden explicar su tema sin leer, y el ensayo completo entra en el tiempo.

---

<a id="p-14"></a>
### P-14 · Congelar la versión final 🔴 · S

- [ ] Todo en `main`, CI en verde (P-03) y `git status` limpio.
- [ ] `git tag v1.0.0 && git push --tags`.
- [ ] Guardar **fuera del repositorio** (Drive o similar): el **APK final**, el **video** del recorrido y un **PDF o copia** de la documentación.
- [ ] **No tocar más el código** después del ensayo final (cada cambio de último momento necesita volver a probar todo).

**Listo cuando:** existe la etiqueta `v1.0.0` y la copia de respaldo.

---

## 4. Verificaciones que nadie pudo hacer

Estas cosas **funcionan en las pruebas y en la computadora**, pero dependen de un teléfono real, de
un servicio externo o de GitHub. Hay que comprobarlas y, si fallan, avisar:

| Qué | Por qué no se pudo comprobar | Cómo verificarlo |
|---|---|---|
| Que los **workflows de GitHub** pasen | Nunca se ejecutaron en GitHub | P-03 |
| Que la app **se vea y se mueva bien** en un teléfono | Sólo se comprobó que compila y que la lógica anda | P-06 |
| **Push remotas** | Necesitan teléfono real y credenciales | P-10; casos N-01 a N-06 |
| **Recordatorio local de 2 h** llega a la hora correcta | Requiere esperar la hora real | Caso T-31 |
| **Build de EAS** (APK/AAB) | Necesita las cuentas del grupo | P-09 |
| **Mapa de Android** con la clave | Necesita la clave de Google | P-11 |
| **iPhone** (Face ID, Apple Maps, push) | Sin dispositivo ni cuenta de Apple | P-09, P-10 |

---

## 5. Si algo falla en el teléfono: por dónde mirar primero

Hipótesis ordenadas por probabilidad. No se confirmó que fallen: son los **puntos más delicados**
del código, los que conviene mirar primero.

| Síntoma | Causa posible | Dónde mirar |
|---|---|---|
| La IP nueva **no se aplica** | Caché de Expo | `npx expo start -c` (README §3.2) |
| "Sin conexión" o listas vacías en una wifi sin internet | Ya corregido (B-14); si reaparece, mirar el `console.log` de `misReservas` | `src/servicios/misReservas.ts` |
| La **foto o el video** no se ven sin conexión (T-34) | La descarga con la API nueva de archivos falló | Log "No se pudo guardar el archivo en el teléfono"; `src/servicios/archivos.ts` |
| Al **tocar una notificación** con la app cerrada no navega (N-04) | Espera la pantalla de huella/PIN o la ruta no está lista | `NavegarAlTocarAviso` en `src/app/_layout.tsx` |
| El **recordatorio** no llega (T-31) | Permiso denegado, o faltaban menos de 2 h | `programarRecordatorio` en `src/servicios/notificaciones.ts` (devuelve `false` sin avisar) |
| Un **modal** (bloqueos, fijas, precios) queda tapado por el teclado en Android | `KeyboardAvoidingView` sin comportamiento en Android | Los `<KeyboardAvoidingView>` de `bloqueos.tsx`, `fijas.tsx`, `precios.tsx` |
| El **botón "atrás"** de Android vuelve a la pantalla de entrada | Dos rutas resuelven a `/` (D-12) | `app/index.tsx` y `app/(tabs)/index.tsx`; se navega siempre con `router.replace('/(tabs)')` |
| El **escáner** no abre la cámara | Permiso denegado o el teléfono no tiene huella enrolada | `(tabs)/escaner.tsx`, `inicializarEscaner()` |
| El **mapa** no se dibuja (sólo en APK de Android) | Falta `GOOGLE_MAPS_API_KEY` | P-11; `app.config.js` |
| `getExpoPushTokenAsync` falla | Falta `projectId` (`eas init`) o Android con Expo Go | `registrarParaPush()` en `notificaciones.ts` |
| La **grilla** no muestra "Hoy" bien de noche | (corregido) fecha local en vez de UTC | Caso T-29; `aFechaLocal` en `servicios/turnos.ts` |

---

## 6. Plantillas

### 6.1 Reparto sugerido por perfil

No se asumió cuántos son: repartan por **lo que cada uno tenga a mano**.

| Quién | Tareas que le conviene tomar |
|---|---|
| El que tiene la **cuenta de Expo** y maneja EAS | P-09, P-10 (parte EAS), P-14 |
| El que tiene un teléfono **Android** | P-06 (Android), P-11, caso del escáner y mapa |
| El que tiene un **iPhone** (si hay) | P-06 (iOS: push con Expo Go, Face ID) |
| El que maneja la **API / servidor** | P-02, P-08, base de datos de demo |
| El que **coordina** | P-01, P-03, P-04, P-13 (ensayos), P-14 |

### 6.2 Tabla para registrar los resultados de P-06

| Caso | Dispositivo (modelo y sistema) | Resultado | Responsable | Observaciones / captura |
|---|---|---|---|---|
| T-10 | | ☐ OK ☐ Falla | | |
| T-11 | | ☐ OK ☐ Falla | | |
| | | | | |

### 6.3 Cómo anotar una falla

```text
Caso:           T-__  (o descripción)
Dispositivo:    modelo + versión de Android/iOS + Expo Go o APK
Pasos:          1) … 2) … 3) …
Esperado:       …
Obtenido:       …  (captura o video)
Mensaje/Log:    …  (consola de Expo o `adb logcat`)
Frecuencia:     siempre / a veces
Gravedad:       bloquea la demo / molesta / cosmética
```

---

## 7. Mejoras opcionales 🟢

Sólo si sobra tiempo **después** de P-06 y P-13. Ninguna es necesaria para entregar.

| # | Mejora | Esfuerzo | Detalle |
|---|---|---|---|
| O-01 | **Usar `expo-sensors`** (el PRD lo lista y hoy no se usa) | M | Por ejemplo, **agitar el teléfono para recargar** "Mis reservas" con `Accelerometer` y una vibración (`expo-haptics`). Confirmar antes con el docente (D-C) |
| O-02 | Reducir los **`any`** (D-05) | M | Quedan 22. Los más cargados: `src/app/index.tsx` (4), `espacio/disponibilidad.tsx` (3), `espacio/[id].tsx` (3), `(tabs)/perfil.tsx` (3). Usar los tipos del PRD (`Espacio`, `Reserva`, `Turno`, `Usuario`) |
| O-03 | **Editar reservas fijas** y **bloquear varios días** a la vez (D-19) | M | La API ya tiene `PATCH /fijas/:id`; un bloqueo hoy cubre un solo día |
| O-04 | **Pruebas de render de pantallas** (D-13) | L | Empezar por "Mis reservas" (en línea y sin conexión), la agenda y el formulario de bloqueos, con Testing Library y `expo-router` simulado. Ver `docs/07 §4.6` |
| O-05 | **Estilo oscuro del mapa en Android** | S–M | `userInterfaceStyle` sólo lo aplica iOS; en Android hace falta un JSON de estilo (`customMapStyle`) |
| O-06 | **Pantalla de detalle de una reserva** | M | Para que el aviso "Reserva cancelada" lleve a la reserva concreta (B-13, hoy lleva a "Mis reservas") |
| O-07 | **Subir la foto del reporte** de una cancha | L | Requiere un endpoint nuevo en la API (hoy no hay forma de asociar una foto a un espacio): hablar con la cátedra |
| O-08 | Resolver la **ruta `/` ambigua** (D-12) | M | Funciona hoy; sólo vale la pena si en P-06 el botón "atrás" de Android molesta |
| O-09 | Unificar las **tres bases SQLite** (D-06), componentes de interfaz reutilizables (D-17) | M–L | Calidad interna; no cambia lo que ve el usuario |
| O-10 | **Auditoría de accesibilidad** | M | No se hizo: faltan `accessibilityLabel` en botones con sólo un ícono (✕, ‹, ›, tacho) y revisar contraste en modo oscuro |
| O-11 | Filtros del catálogo **en el servidor** (D-03) | S | La API soporta `?deporteId=&complejo=`; con 11 espacios no hace falta |

---

## 8. Lo que NO hace falta hacer

Para no gastar tiempo en cosas que ya están decididas o resueltas:

- **No cambiar** que el escáner sea sólo del personal: es lo que pide el PRD y lo exige la API (aclarado en una consulta anterior).
- **No tocar la API de la cátedra**, salvo `src/student-notifications/` y su módulo (lo único que les correspondía).
- **No volver a Leaflet / WebView** para el mapa: el PRD pide `react-native-maps`.
- **No "arreglar" B-08 ni B-13** (decididos en `docs/08`): son comportamientos aceptados.
- **No reescribir la documentación**: ya está verificada contra el código. Sólo hay que completar los `COMPLETAR` (P-04).

---

## 9. Definición de "terminado"

El trabajo está listo para entregar cuando **todo** esto es cierto:

- [ ] `main` tiene todas las entregas aplicadas, los lockfiles al día y el **CI en verde** (P-01, P-02, P-03).
- [ ] Los `COMPLETAR` de la documentación están completos (P-04).
- [ ] El **recorrido de humo** pasó en al menos **un Android** (y un iPhone, si hay) (P-06).
- [ ] La **demostración** se ensayó completa, dos veces, dentro del tiempo (P-07, P-13).
- [ ] Cada integrante puede explicar **su tema** y sabe **qué es de la cátedra y qué es del grupo** (P-13).
- [ ] Si el docente exige el build de producción: **APK/AAB generado** y probado (P-08 a P-11).
- [ ] Existe la etiqueta `v1.0.0` y un **respaldo** del APK, del video y de la documentación (P-14).
