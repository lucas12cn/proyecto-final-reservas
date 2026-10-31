// Manejo común de errores de la API. Toda respuesta de error tiene la forma
//   { "error": { "codigo": "TURNO_OCUPADO", "mensaje": "Ese turno ya fue reservado." } }
// El `codigo` no cambia nunca (se compara contra él); el `mensaje` está listo para mostrarse.

export class ErrorDeApi extends Error {
  constructor(
    mensaje: string,
    /** Código de la API (`TURNO_OCUPADO`) o, si el error nace en la app, `SIN_SESION`. */
    readonly codigo?: string,
    /** Estado HTTP; `undefined` si el error no vino de una respuesta. */
    readonly estado?: number,
  ) {
    super(mensaje);
    this.name = 'ErrorDeApi';
  }
}

// El AuthContext se anota acá para que, cuando la API diga que la sesión venció, se cierre la
// sesión sin que cada pantalla tenga que ocuparse.
let alSesionVencida: (() => void) | null = null;

export const registrarAlSesionVencida = (accion: () => void) => {
  alSesionVencida = accion;
  return () => {
    if (alSesionVencida === accion) alSesionVencida = null;
  };
};

/** Error para cuando se intenta algo que necesita sesión y no hay token guardado. */
export const errorSinSesion = () =>
  new ErrorDeApi('Tenés que ingresar con tu cuenta.', 'SIN_SESION');

/** Arma el error a partir de una respuesta no exitosa, usando el mensaje de la API. */
export const errorDesdeRespuesta = async (
  respuesta: Response,
  porDefecto: string,
): Promise<ErrorDeApi> => {
  const cuerpo = await respuesta.json().catch(() => null);
  const mensaje: string = cuerpo?.error?.mensaje ?? porDefecto;
  const codigo: string | undefined = cuerpo?.error?.codigo;
  if (codigo === 'NO_AUTENTICADO') alSesionVencida?.();
  return new ErrorDeApi(mensaje, codigo, respuesta.status);
};

/** Lanza el error de la API si la respuesta no fue exitosa. */
export const lanzarSiError = async (respuesta: Response, porDefecto: string) => {
  if (!respuesta.ok) throw await errorDesdeRespuesta(respuesta, porDefecto);
};

/** Código del error (si lo tiene), para decidir qué hacer en la pantalla. */
export const codigoDe = (error: unknown): string | undefined =>
  error instanceof ErrorDeApi ? error.codigo : undefined;

/** Mensaje para mostrar, venga de donde venga el error. */
export const mensajeDe = (error: unknown, porDefecto: string): string =>
  error instanceof Error && error.message ? error.message : porDefecto;
