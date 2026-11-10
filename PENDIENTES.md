# Tareas pendientes del grupo

> **Acordado con la cátedra (ya decidido, no hace falta volver a preguntarlo):**
> se entrega un **build `preview`**; la **demostración se hace en Expo Go**; **no hay que publicar** nada
> y la **API local alcanza**; es **aceptable** que el reporte de foto quede en el teléfono; y los
> **sensores son opcionales** (el GPS del mapa ya cuenta).
>
> **Estado al cierre:** el código de la app y la integración de notificaciones push en la API están
> terminados y verificados **en una computadora** (215 pruebas automáticas de la app, 302 + 25 + 1161
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
| 6 | [P-06](#p-06) | **Probar todo en teléfonos reales** (Expo Go) | 🔴 | L | Teléfonos | | ☐ |
| 7 | [P-07](#p-07) | Preparar la demostración en Expo Go | 🔴 | S | P-06 | | ☐ |
| 8 | [P-09](#p-09) | **Generar el build `preview` (APK) y probarlo con la API local** | 🔴 | M | Cuenta de Expo | | ☐ |
| 9 | [P-12](#p-12) | Íconos y pantalla de inicio propios | 🟡 | M | Diseño | | ☐ |
| 10 | [P-13](#p-13) | Preparar y ensayar la defensa | 🔴 | L | Todos | | ☐ |
| 11 | [P-14](#p-14) | Congelar la versión final | 🔴 | S | Todo lo anterior | | ☐ |
| — | [P-10](#p-10) | Notificaciones push en el APK | 🟢 opcional | M | Cuenta Firebase | | ☐ |
| — | [P-11](#p-11) | Clave de Google Maps para el APK | 🟢 opcional | S–M | Cuenta Google Cloud | | ☐ |
| ✂ | P-08 | ~~Publicar la API~~ | no aplica | — | La API local alcanza | — | — |

**Ruta crítica:** **P-01 → P-02 → P-04 → P-05 → P-06 → P-07 → P-09 → P-13**. Sin P-09 la app se puede
mostrar y defender con Expo Go, pero **falta el build `preview` que hay que entregar**.

---

## 2. Decisiones

### 2.1 Ya resueltas por la cátedra

| Tema | Respuesta | Efecto en la app y en las tareas |
|---|---|---|
| Qué se entrega | Un **build `preview`** (APK) | Tarea **P-09** (obligatoria) |
| Cómo se hace la demostración | En **Expo Go** | Tarea **P-07**; en Expo Go **Android no recibe push remotas** (un iPhone sí) |
| ¿Hay que publicar? | **No**; la **API local es suficiente** | Se descarta publicar la API (P-08) y subir a una tienda. Pero un APK **no puede grabar la IP de la notebook** y los builds de producción **bloquean `http://`**: por eso se agregó, en la app, el cuadro **Servidor** (se elige la IP) y se habilitó `http` a la red local en `preview`/`development` |
| Reporte de foto sólo en el teléfono | **Aceptable** | B-12 cerrado (`docs/08`) |
| Sensores | **Opcionales** (ej. GPS) | El GPS ya se usa en el mapa; `expo-sensors` no hace falta |

### 2.2 Todavía a cargo del grupo

**D-B · ¿Se mantiene el identificador de la app?** Es `com.villaguay.reservasdeportivas` (Android
`package` e iOS `bundleIdentifier` en `my-app/app.json`). Cámbienlo **antes del primer build** si
prefieren otro (por ejemplo con el dominio de la facultad); después de publicar en una tienda ya no se
puede cambiar (aquí no se publica). Decisión: ______________________

**D-C · Preguntas que todavía conviene confirmar por escrito**

- [ ] Formato de entrega de la documentación (repositorio, PDF, presentación).
- [ ] ¿El APK se entrega como **archivo** (enlace de EAS / copia del `.apk`) o hay que subirlo a algún lado?
- [ ] ¿Cuenta de Expo propia o de la cátedra?

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
| **Servidor elegido desde la app** | **T-62** | |
| Notificaciones push (**sólo iPhone** con Expo Go; Android no las recibe en Expo Go) | N-01, N-02, N-04 | |

**Paso 2 · Plan completo.** Los **76 casos** del plan manual, repartidos entre los integrantes.
Registren cada resultado (§6.2).

**Paso 3 · Probar con la hora real.** Los casos **T-29** (grilla entre las 21 y las 24) y **T-41/T-42**
(ausente: hay que esperar 15 minutos desde el inicio del turno) dependen de la hora. Planifíquenlos.

**Listo cuando:** el recorrido de humo está completo, cada falla está anotada (§6.3) y las fallas
que bloquean la demostración están corregidas.

> En la §5 hay una lista de **lo primero que conviene mirar si algo falla**.

---

<a id="p-07"></a>
### P-07 · Preparar la demostración en Expo Go 🔴 · S

Ya está decidido: **Expo Go + API local**. Preparar:

- **Una cuenta de jugador y una de encargado** ya probadas; la API corriendo en una notebook; los dos
  teléfonos en la misma wifi (o un *hotspot*). La dirección se configura en la app (**Servidor**) o con
  `.env.local` + `npx expo start -c`.
- **Qué NO se puede mostrar:** push remotas en **Android** (Expo Go no las soporta). Si quieren mostrarlas,
  usen un **iPhone** con Expo Go. El **recordatorio local** de 2 h no depende de esto.
- Guion en `docs/09-guia-de-defensa.md §5`.

**Listo cuando:** el guion de la demostración se hizo completo **dos veces seguidas** sin fallas.

---

<a id="p-08"></a>
### P-08 · ~~Publicar la API en internet~~ — **no aplica**

La cátedra confirmó que **la API local alcanza**. (Si algún día quisieran publicarla: `api-reservas-deportivas/README.md §11`,
Render + Supabase; el APK tendría que apuntar a una dirección `https://`.)

---

<a id="p-09"></a>
### P-09 · Generar el build `preview` (APK) y probarlo con la API local 🔴 · M

Es **el entregable**. Detalle completo en `README.md §5`.

```bash
cd my-app
npm install -g eas-cli          # o: npx eas-cli <comando>
eas login                       # cuenta de expo.dev (gratis)
eas init                        # agrega extra.eas.projectId a app.json → COMMITEARLO
eas build --platform android --profile preview     # EAS entrega un enlace/QR para instalar el APK
```

**No hace falta tocar `eas.json` ni tener una URL `https`.** Probarlo, con la API local:

1. Levantar la API en la notebook (`pnpm dev`) y anotar la IP que imprime.
2. Instalar el APK en un teléfono **de la misma wifi**.
3. Abrir la app → **Servidor → Cambiar** → `http://IP:3000` → **Probar** → **Guardar**.
4. Repetir el **recorrido de humo** (P-06) y los casos **B-01, B-07 y B-08** del plan (`docs/07 §5.4`).

Cosas a tener en cuenta:

- **Sin la clave de Google Maps el APK no dibuja el mapa**: muestra la **lista de complejos** con "Cómo llegar"
  (diseñado así a propósito; ver P-11). **Sin credenciales de push el APK no recibe push remotas** (ver P-10).
  Las dos cosas son aceptables para esta entrega, pero conviene **decirlo** en la defensa.
- **iPhone:** `eas build --platform ios` necesita una cuenta de Apple Developer (paga). Si no la tienen, se
  entrega sólo Android y se aclara.
- ⚠️ **Nunca se probó un APK real.** El mapa alternativo (B-08) y el acceso `http` a la red local (B-07) están
  verificados con pruebas y con `expo config`, pero **hay que confirmarlos en el teléfono**.

**Listo cuando:** el APK instalado muestra el catálogo y permite iniciar sesión y reservar contra la API local
(tras elegir el servidor), y el `.apk` o su enlace está guardado (P-14).

---

<a id="p-10"></a>
### P-10 · Notificaciones push en el APK 🟢 opcional · M

**No hace falta** para esta entrega (la demostración es en Expo Go). Sirve si quieren que el **APK** reciba
push remotas.

**Android:** (1) crear un proyecto en **Firebase** con una app Android de paquete `com.villaguay.reservasdeportivas`
(o el de D-B); (2) bajar `google-services.json`, ponerlo en `my-app/` y agregar `"googleServicesFile": "./google-services.json"`
dentro de `android` en `app.json`; (3) subir a EAS la clave de cuenta de servicio **FCM V1** con `eas credentials`
(Android → Google Service Account → FCM V1). **No commitear** esa clave. **iPhone:** una APNs key (cuenta de Apple Developer).

**Probar:** `NOTIFICACIONES=expo` en el `.env` de la API y los casos **N-01 a N-06**.

---

<a id="p-11"></a>
### P-11 · Clave de Google Maps para el APK 🟢 opcional · S–M

**No hace falta**: sin ella el APK muestra la lista de complejos (B-17). Sirve si quieren el **mapa** en el APK
(en Expo Go y en iPhone ya funciona sin clave). Detalle en `README.md §5.4`:

1. En **Google Cloud**: proyecto + habilitar **Maps SDK for Android**.
2. Crear una **API key** restringida al paquete de D-B y al **SHA-1** del certificado de firma (aparece en
   *Credentials* del proyecto en expo.dev **después del primer build**).
3. Cargarla como variable de EAS **`GOOGLE_MAPS_API_KEY`** (dashboard de expo.dev → *Environment variables*, o
   `eas env:create`) para el entorno `preview`, y **hacer un nuevo build** (habrá dos: el SHA-1 sólo se conoce tras el primero).
4. Probar **T-21, T-35 y T-36** en el APK.

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
- [ ] Notebook con la API corriendo (`pnpm dev`) y `GET /salud` respondiendo.
- [ ] Misma wifi (o *hotspot*) y la **IP correcta**: en la app (**Servidor → Probar**) o en `.env.local` + `npx expo start -c`.
- [ ] Cuentas de demo: `emiliano@mail.com` (jugador), `marcelo@villaguay.demo.ar` (encargado), `nahuel@villaguay.demo.ar` (administrador); contraseña `villaguay2026`.
- [ ] Base **reiniciada** justo antes (`pnpm db:reiniciar`) para tener datos de demo limpios.
- [ ] Si se muestra push: **iPhone** con Expo Go, `NOTIFICACIONES=expo` en el `.env` de la API y permiso concedido (Android no recibe push en Expo Go).
- [ ] Tener a mano el **APK** instalado en un teléfono, por si piden ver el build entregado.

**Listo cuando:** todos pueden explicar su tema sin leer, y el ensayo completo entra en el tiempo.

---

<a id="p-14"></a>
### P-14 · Congelar la versión final 🔴 · S

- [ ] Todo en `main`, CI en verde (P-03) y `git status` limpio.
- [ ] `git tag v1.0.0 && git push --tags`.
- [ ] Guardar **fuera del repositorio** (Drive o similar): el **APK `preview` final**, el **video** del recorrido y un **PDF o copia** de la documentación.
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
| El **APK `preview`** instala, abre y habla con la API local por `http` | Nunca se generó un APK; la configuración de `http` y el mapa alternativo se verificaron con pruebas y `expo config` | P-09; casos B-01, B-07, B-08 |
| **Recordatorio local de 2 h** llega a la hora correcta | Requiere esperar la hora real | Caso T-31 |
| **Push remotas** (sólo iPhone en Expo Go; Android sólo con credenciales en el APK) | Necesitan teléfono real | Casos N-01 a N-06 |
| **iPhone** (Face ID, Apple Maps) | Sin dispositivo ni cuenta de Apple | P-06 (en Expo Go) |
---

## 5. Si algo falla en el teléfono: por dónde mirar primero

Hipótesis ordenadas por probabilidad. No se confirmó que fallen: son los **puntos más delicados**
del código, los que conviene mirar primero.

| Síntoma | Causa posible | Dónde mirar |
|---|---|---|
| La app **no carga datos** (Expo Go o APK) | IP equivocada, API apagada o redes distintas | **Servidor → Probar** en la app; README §3.2 |
| La IP de `.env.local` **no se aplica** | Caché de Expo | `npx expo start -c`, o cambiarla desde **Servidor** (no tiene esta trampa) |
| "Sin conexión" o listas vacías en una wifi sin internet | Ya corregido (B-14); si reaparece, mirar el `console.log` de `misReservas` | `src/servicios/misReservas.ts` |
| La **foto o el video** no se ven sin conexión (T-34) | La descarga con la API nueva de archivos falló | Log "No se pudo guardar el archivo en el teléfono"; `src/servicios/archivos.ts` |
| Al **tocar una notificación** con la app cerrada no navega (N-04) | Espera la pantalla de huella/PIN o la ruta no está lista | `NavegarAlTocarAviso` en `src/app/_layout.tsx` |
| El **recordatorio** no llega (T-31) | Permiso denegado, o faltaban menos de 2 h | `programarRecordatorio` en `src/servicios/notificaciones.ts` (devuelve `false` sin avisar) |
| Un **modal** (bloqueos, fijas, precios) queda tapado por el teclado en Android | `KeyboardAvoidingView` sin comportamiento en Android | Los `<KeyboardAvoidingView>` de `bloqueos.tsx`, `fijas.tsx`, `precios.tsx` |
| El **botón "atrás"** de Android vuelve a la pantalla de entrada | Dos rutas resuelven a `/` (D-12) | `app/index.tsx` y `app/(tabs)/index.tsx`; se navega siempre con `router.replace('/(tabs)')` |
| El **escáner** no abre la cámara | Permiso denegado o el teléfono no tiene huella enrolada | `(tabs)/escaner.tsx`, `inicializarEscaner()` |
| En el **APK** se ve una lista de complejos y no el mapa | Es lo esperado sin `GOOGLE_MAPS_API_KEY` (B-17) | P-11; `app.config.js`; `servicios/mapa.ts` |
| `getExpoPushTokenAsync` falla | Falta `projectId` (`eas init`) o Android con Expo Go | `registrarParaPush()` en `notificaciones.ts` |
| La **grilla** no muestra "Hoy" bien de noche | (corregido) fecha local en vez de UTC | Caso T-29; `aFechaLocal` en `servicios/turnos.ts` |

---

## 6. Plantillas

### 6.1 Reparto sugerido por perfil

No se asumió cuántos son: repartan por **lo que cada uno tenga a mano**.

| Quién | Tareas que le conviene tomar |
|---|---|
| El que tiene la **cuenta de Expo** y maneja EAS | P-09, P-10 (parte EAS), P-14 |
| El que tiene un teléfono **Android** | P-06 (Android), P-09 (instalar y probar el APK), escáner y mapa |
| El que tiene un **iPhone** (si hay) | P-06 (iOS: push con Expo Go, Face ID) |
| El que maneja la **API / servidor** | P-02, base de datos de demo, P-07 (que la API esté lista) |
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

Sólo si sobra tiempo **después** de P-06 y P-13. Ninguna es necesaria para entregar. (Ya no figuran el uso de `expo-sensors` ni la subida de la foto del reporte: la cátedra los dio por opcionales / aceptables.)

| # | Mejora | Esfuerzo | Detalle |
|---|---|---|---|
| O-02 | Reducir los **`any`** (D-05) | M | Quedan 22. Los más cargados: `src/app/index.tsx` (4), `espacio/disponibilidad.tsx` (3), `espacio/[id].tsx` (3), `(tabs)/perfil.tsx` (3). Usar los tipos del PRD (`Espacio`, `Reserva`, `Turno`, `Usuario`) |
| O-03 | **Editar reservas fijas** y **bloquear varios días** a la vez (D-19) | M | La API ya tiene `PATCH /fijas/:id`; un bloqueo hoy cubre un solo día |
| O-04 | **Pruebas de render de pantallas** (D-13) | L | Empezar por "Mis reservas" (en línea y sin conexión), la agenda y el formulario de bloqueos, con Testing Library y `expo-router` simulado. Ver `docs/07 §4.6` |
| O-05 | **Estilo oscuro del mapa en Android** | S–M | `userInterfaceStyle` sólo lo aplica iOS; en Android hace falta un JSON de estilo (`customMapStyle`) |
| O-06 | **Pantalla de detalle de una reserva** | M | Para que el aviso "Reserva cancelada" lleve a la reserva concreta (B-13, hoy lleva a "Mis reservas") |
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
- **No publicar la API ni la app** (ni en Render ni en Google Play): la cátedra confirmó que no hace falta.
- **No conseguir un certificado `https`** ni migrar a `production` para el preview: en `preview` el `http` a la red local ya está permitido.
- **No conseguir la clave de Google Maps ni las credenciales de push** si no quieren: son opcionales (P-10, P-11).
- **No agregar sensores**: son opcionales y el GPS del mapa ya cuenta.
- **No reescribir la documentación**: ya está verificada contra el código. Sólo hay que completar los `COMPLETAR` (P-04).

---

## 9. Definición de "terminado"

El trabajo está listo para entregar cuando **todo** esto es cierto:

- [ ] `main` tiene todas las entregas aplicadas, los lockfiles al día y el **CI en verde** (P-01, P-02, P-03).
- [ ] Los `COMPLETAR` de la documentación están completos (P-04).
- [ ] El **recorrido de humo** pasó en al menos **un Android** (y un iPhone, si hay) (P-06).
- [ ] La **demostración** se ensayó completa, dos veces, dentro del tiempo (P-07, P-13).
- [ ] Cada integrante puede explicar **su tema** y sabe **qué es de la cátedra y qué es del grupo** (P-13).
- [ ] El **APK `preview`** está generado, probado contra la API local (elegir el servidor en la app) y guardado (P-09).
- [ ] Existe la etiqueta `v1.0.0` y un **respaldo** del APK, del video y de la documentación (P-14).
