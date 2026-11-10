# Documentación técnica — Reservas Deportivas · Villaguay

Documentación para **desarrolladores** (no para usuarios finales). Su objetivo es que cualquier
integrante del grupo pueda explicar el sistema completo: por qué existe, cómo se diseñó, cómo
está hecho y dónde mirar en el código.

> **Estado documentado:** versión final del trabajo. Parte del repositorio `proyecto-final-reservas`
> (commit `3c59b52`) y suma lo que hizo el grupo: la integración de notificaciones push (módulo de
> dispositivos en la API y servicio de notificaciones en la app), el recordatorio local, el caché sin
> conexión, el mapa nativo, las pantallas del personal (agenda, bloqueos, reservas fijas y precios),
> la configuración de EAS, **215 pruebas automáticas** y el CI. Todo lo que se afirma sobre el
> código fue verificado leyéndolo y ejecutándolo; lo que no se pudo verificar (comportamiento en un
> teléfono real, los workflows en GitHub, el build de EAS) se marca como tal. Lo pendiente está en el
> resumen de [08](08-estado-actual-y-deuda-tecnica.md).

## 1. Cómo leer esta documentación

| Si necesitás… | Leé |
|---|---|
| Entender el problema y qué se pidió | [01 Planificación y requerimientos](01-planificacion-y-requerimientos.md) |
| Dibujar el sistema en una pizarra | [02 Arquitectura](02-arquitectura.md) |
| Explicar cómo se calcula la grilla, cómo se evita la doble reserva, los errores | [03 API](03-api-backend.md) |
| Explicar una pantalla de la app o una función concreta | [04 App móvil](04-app-movil.md) |
| Explicar las notificaciones de punta a punta | [05 Notificaciones push](05-notificaciones-push.md) |
| Ver los tipos, las tablas o un endpoint | [06 Modelo de datos y contrato](06-modelo-de-datos-y-contrato.md) |
| Saber cómo se prueba y cómo correr los tests | [07 Pruebas y calidad](07-pruebas-y-calidad.md) |
| Saber qué falta y qué está mal (¡antes de la defensa!) | [08 Estado actual y deuda técnica](08-estado-actual-y-deuda-tecnica.md) |
| Prepararse para la defensa oral | [09 Guía de defensa](09-guia-de-defensa.md) |
| Saber qué tareas quedan y quién las hace | [`PENDIENTES.md`](../PENDIENTES.md) (en la raíz del repositorio) |

**Orden recomendado para estudiar:** 01 → 02 → 06 → 03 → 04 → 05 → 07 → 08 → 09.

## 2. Qué es de la cátedra y qué es del grupo

Esta distinción importa en la defensa: hay que poder decir con precisión qué se programó y qué
se recibió hecho.

| Componente | Origen | Comentario |
|---|---|---|
| PRD (`prd.pdf`) y tipos de `src/tipos/` | Cátedra | Los tipos se copiaron literalmente del PRD |
| API completa (`api-reservas-deportivas/`) | Cátedra | NestJS, reglas de negocio, tests, Docker, CI, semillas |
| Módulo de dispositivos push (`student-notifications/`) | **Grupo** | La API lo dejó "a completar" (responde 501 hasta que se hace) |
| Aplicación móvil (`my-app/`) | **Grupo** | Pantallas, navegación, sesión, caché offline, escáner, mapa |
| Integración de notificaciones en la app | **Grupo** | `servicios/notificaciones.ts`, manejo de toques, alta/baja del token |
| Esta documentación | **Grupo** | |

## 3. Glosario

| Término | Significado |
|---|---|
| **PRD** | *Product Requirements Document*: el pedido de Nahuel Ojeda, director de Deportes |
| **Espacio** | Una cancha o gimnasio (11 en total). Ej.: `esp-02` "Cancha 2 — Fútbol 5" |
| **Complejo** | Lugar físico que agrupa espacios (Polideportivo Municipal, Parque Berduc) |
| **Turno** | Una hora concreta de un espacio en un día. **No se guarda en la base**: se calcula |
| **Grilla** | Los 16 turnos (08:00 a 24:00) de un espacio en un día |
| **Reserva** | Un jugador toma un turno. Estados: `confirmada`, `cancelada`, `cumplida`, `ausente` |
| **Reserva fija** | Regla semanal que ocupa el mismo turno todas las semanas (ej.: martes 21 a 22) |
| **Bloqueo** | Un turno o día cerrado por mantenimiento/lluvia, con un motivo |
| **Jugador / Encargado / Administrador** | Los tres roles del sistema |
| **Token de sesión** | JWT que la API entrega al ingresar; se manda en `Authorization: Bearer` |
| **Token de Expo (push)** | Identificador del teléfono para recibir push (`ExponentPushToken[...]`) |
| **Expo Go** | App contenedor para probar proyectos Expo sin compilar |
| **Development build** | App compilada con las librerías nativas del proyecto, necesaria para push en Android |
| **EAS** | Expo Application Services: compila y entrega las apps |
| **Sobre de respuesta** | Formato fijo de la API: `{ datos, meta }` o `{ error: { codigo, mensaje } }` |
| **Idempotencia** | Repetir un pedido no produce un segundo efecto (reintento por mala señal) |
