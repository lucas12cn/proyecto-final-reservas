import { Deporte, Espacio, Reserva, ReservaFija, Turno, Usuario } from "../tipos";

// 1. Deportes disponibles
export const deportesMock: Deporte[] = [
  { id: "dep-futbol5", nombre: "Fútbol 5", icono: "football-outline", color: "#2E7D32" },
  { id: "dep-futbol11", nombre: "Fútbol 11", icono: "football-outline", color: "#1B5E20" },
  { id: "dep-basquet", nombre: "Básquet", icono: "basketball-outline", color: "#E65100" },
  { id: "dep-voley", nombre: "Vóley", icono: "tennisball-outline", color: "#1565C0" },
  { id: "dep-tenis", nombre: "Tenis", icono: "tennisball-outline", color: "#F9A825" }
];

// 2. Los 11 espacios de la Municipalidad de Villaguay
export const espaciosMock: Espacio[] = [
  {
    id: "esp-01",
    nombre: "Cancha 1 Fútbol 5",
    deporteId: "dep-futbol5",
    complejo: "Polideportivo Municipal",
    superficie: "césped sintético",
    techado: false,
    iluminacion: true,
    capacidad: 10,
    precioPorHora: 12000,
    coordenadas: { latitud: -31.8642, longitud: -59.0281 },
    imagenes: ["https://picsum.photos/seed/cancha1/600/400"],
    videoUrl: "https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4",
    reglas: "No se permite calzado con tapones de aluminio.",
    activo: true
  },
  {
    id: "esp-02",
    nombre: "Cancha 2 Fútbol 5",
    deporteId: "dep-futbol5",
    complejo: "Polideportivo Municipal",
    superficie: "césped sintético",
    techado: false,
    iluminacion: true,
    capacidad: 10,
    precioPorHora: 12000,
    coordenadas: { latitud: -31.8642, longitud: -59.0281 },
    imagenes: ["https://picsum.photos/seed/cancha2/600/400"],
    // CASO FEO: un espacio sin video (null)
    videoUrl: null,
    reglas: "No se permite calzado con tapones de aluminio.",
    activo: true
  },
  {
    id: "esp-03",
    nombre: "Cancha Principal Fútbol 11",
    deporteId: "dep-futbol11",
    complejo: "Polideportivo Municipal",
    superficie: "césped natural",
    techado: false,
    iluminacion: true,
    capacidad: 22,
    precioPorHora: 25000,
    coordenadas: { latitud: -31.8645, longitud: -59.0285 },
    imagenes: ["https://picsum.photos/seed/cancha3/600/400"],
    videoUrl: null,
    reglas: "Se suspende automáticamente en días de lluvia.",
    activo: true
  },
  {
    id: "esp-04",
    nombre: "Cancha Básquet 1",
    deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal",
    superficie: "cemento alisado",
    techado: true,
    iluminacion: true,
    capacidad: 10,
    precioPorHora: 10000,
    coordenadas: { latitud: -31.8640, longitud: -59.0280 },
    imagenes: ["https://picsum.photos/seed/basquet1/600/400"],
    videoUrl: null,
    reglas: "Usar zapatillas de suela limpia.",
    activo: true
  },
  {
    id: "esp-05",
    nombre: "Cancha Básquet 2",
    deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal",
    superficie: "cemento alisado",
    techado: false,
    iluminacion: true,
    capacidad: 10,
    precioPorHora: 8000,
    coordenadas: { latitud: -31.8640, longitud: -59.0280 },
    imagenes: ["https://picsum.photos/seed/basquet2/600/400"],
    videoUrl: null,
    reglas: "Cancha al aire libre.",
    activo: true
  },
  {
    id: "esp-06",
    nombre: "Cancha Básquet 3",
    deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal",
    superficie: "cemento alisado",
    techado: false,
    iluminacion: false,
    capacidad: 10,
    precioPorHora: 8000,
    coordenadas: { latitud: -31.8640, longitud: -59.0280 },
    imagenes: ["https://picsum.photos/seed/basquet3/600/400"],
    videoUrl: null,
    reglas: "Solo turnos diurnos, no cuenta con reflectores.",
    activo: true
  },
  {
    id: "esp-07",
    nombre: "Cancha Vóley 1",
    deporteId: "dep-voley",
    complejo: "Polideportivo Municipal",
    superficie: "goma deportiva",
    techado: true,
    iluminacion: true,
    capacidad: 12,
    precioPorHora: 10000,
    coordenadas: { latitud: -31.8641, longitud: -59.0282 },
    imagenes: ["https://picsum.photos/seed/voley1/600/400"],
    videoUrl: null,
    reglas: "No colgarse de la red.",
    activo: true
  },
  {
    id: "esp-08",
    nombre: "Cancha Vóley 2",
    deporteId: "dep-voley",
    complejo: "Polideportivo Municipal",
    superficie: "cemento",
    techado: false,
    iluminacion: true,
    capacidad: 12,
    precioPorHora: 8000,
    coordenadas: { latitud: -31.8641, longitud: -59.0282 },
    imagenes: ["https://picsum.photos/seed/voley2/600/400"],
    videoUrl: null,
    reglas: "Traer pelota propia.",
    activo: true
  },
  {
    id: "esp-09",
    nombre: "Cancha Tenis 1",
    deporteId: "dep-tenis",
    complejo: "Parque Berduc",
    superficie: "polvo de ladrillo",
    techado: false,
    iluminacion: true,
    capacidad: 4,
    precioPorHora: 9000,
    coordenadas: { latitud: -31.8710, longitud: -59.0350 },
    imagenes: ["https://picsum.photos/seed/tenis1/600/400"],
    videoUrl: null,
    reglas: "Pasar la red de arrastre al terminar el turno.",
    activo: true
  },
  {
    id: "esp-10",
    nombre: "Cancha Tenis 2",
    deporteId: "dep-tenis",
    complejo: "Parque Berduc",
    superficie: "polvo de ladrillo",
    techado: false,
    iluminacion: false,
    capacidad: 4,
    precioPorHora: 9000,
    coordenadas: { latitud: -31.8710, longitud: -59.0350 },
    imagenes: ["https://picsum.photos/seed/tenis2/600/400"],
    videoUrl: null,
    reglas: "Pasar la red de arrastre al terminar el turno.",
    activo: true
  },
  {
    id: "esp-11",
    nombre: "Gimnasio Cerrado Municipal",
    deporteId: "dep-voley",
    complejo: "Polideportivo Municipal",
    superficie: "parquet",
    techado: true,
    iluminacion: true,
    capacidad: 20,
    precioPorHora: 15000,
    coordenadas: { latitud: -31.8643, longitud: -59.0283 },
    imagenes: ["https://picsum.photos/seed/gimnasio/600/400"],
    videoUrl: null,
    reglas: "Prohibido ingresar con bebidas azucaradas o comida.",
    activo: true
  }
];

// 3. Usuarios de prueba (Jugador y Encargado Marcelo)
export const usuariosMock: Usuario[] = [
  {
    id: "usr-207",
    nombre: "Emiliano Ruiz",
    email: "emiliano@mail.com",
    telefono: "3455-401122",
    rol: "jugador",
    espaciosFavoritos: ["esp-02"],
    cancelacionesTardias: 1,
    ausencias: 0
  },
  {
    id: "usr-001",
    nombre: "Marcelo (Encargado)",
    email: "marcelo@villaguay.gob.ar",
    telefono: "3455-112233",
    rol: "encargado",
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0
  }
];

// 4. Reservas fijas (CASO FEO: ocupa todos los martes a las 21)
export const reservasFijasMock: ReservaFija[] = [
  {
    id: "fij-07",
    espacioId: "esp-02",
    titular: "Grupo de los martes",
    dia: 2, // 2 = martes
    inicio: "21:00",
    fin: "22:00",
    desde: "2026-03-01",
    hasta: null,
    activa: true
  }
];

// 5. Turnos de prueba (incluye libres, ocupados y bloqueados por lluvia)
export const turnosMock: Turno[] = [
  {
    id: "tur-0219-18",
    espacioId: "esp-02",
    fecha: "2026-09-26",
    inicio: "18:00",
    fin: "19:00",
    estado: "reservado",
    reservaId: "res-1180",
    motivoBloqueo: null,
    precio: 12000
  },
  {
    id: "tur-0219-19",
    espacioId: "esp-02",
    fecha: "2026-09-26",
    inicio: "19:00",
    fin: "20:00",
    estado: "libre",
    reservaId: null,
    motivoBloqueo: null,
    precio: 12000
  },
  {
    id: "tur-0219-20",
    espacioId: "esp-02",
    fecha: "2026-09-26",
    inicio: "20:00",
    fin: "21:00",
    // CASO FEO: bloqueado por mantenimiento / lluvia
    estado: "mantenimiento",
    reservaId: null,
    motivoBloqueo: "Cancha anegada por lluvia",
    precio: 12000
  },
  {
    id: "tur-0219-21",
    espacioId: "esp-02",
    fecha: "2026-09-26",
    inicio: "21:00",
    fin: "22:00",
    estado: "fijo",
    reservaId: null,
    motivoBloqueo: "Grupo de los martes",
    precio: 12000
  }
];

// 6. Reservas de los usuarios (incluye confirmada y cancelada)
export const reservasMock: Reserva[] = [
  {
    id: "res-1180",
    turnoId: "tur-0219-18",
    espacioId: "esp-02",
    usuarioId: "usr-207",
    cantidadPersonas: 10,
    codigoQr: "VGY-1180-0219-18",
    estado: "confirmada",
    ingresoEn: null,
    creadaEn: "2026-09-24T21:04:00-03:00",
    cancelableHasta: "2026-09-26T14:00:00-03:00"
  },
  {
    id: "res-1175",
    turnoId: "tur-0210-19",
    espacioId: "esp-01",
    usuarioId: "usr-207",
    cantidadPersonas: 10,
    codigoQr: "VGY-1175-0210-19",
    // CASO FEO: una reserva cancelada
    estado: "cancelada",
    ingresoEn: null,
    creadaEn: "2026-09-10T10:00:00-03:00",
    cancelableHasta: "2026-09-12T15:00:00-03:00"
  }
];