import {
  ErrorDeApi, codigoDe, errorDesdeRespuesta, errorSinSesion, lanzarSiError, mensajeDe,
  registrarAlSesionVencida,
} from '../src/servicios/errores';

// Una respuesta mínima, con la forma que usa fetch
const respuesta = (estado: number, cuerpo: unknown, ok = estado < 400) =>
  ({ ok, status: estado, json: async () => cuerpo }) as unknown as Response;

const errorApi = (codigo: string, mensaje: string) => ({ error: { codigo, mensaje } });

describe('errorDesdeRespuesta', () => {
  it('usa el mensaje y el código de la API', async () => {
    const e = await errorDesdeRespuesta(respuesta(409, errorApi('TURNO_OCUPADO', 'Ese turno ya fue reservado.')), 'defecto');
    expect(e).toBeInstanceOf(ErrorDeApi);
    expect(e.message).toBe('Ese turno ya fue reservado.');
    expect(e.codigo).toBe('TURNO_OCUPADO');
    expect(e.estado).toBe(409);
  });

  it('nunca muestra "[object Object]" (el error de la API es un objeto)', async () => {
    const e = await errorDesdeRespuesta(respuesta(422, errorApi('LIMITE_DE_RESERVAS', 'Ya tenés tres reservas activas.')), 'defecto');
    expect(e.message).not.toContain('[object Object]');
  });

  it('si el cuerpo no se puede leer, usa el mensaje por defecto', async () => {
    const rota = { ok: false, status: 502, json: async () => { throw new Error('no es JSON'); } } as unknown as Response;
    const e = await errorDesdeRespuesta(rota, 'No se pudo cargar');
    expect(e.message).toBe('No se pudo cargar');
    expect(e.codigo).toBeUndefined();
    expect(e.estado).toBe(502);
  });

  it('si el cuerpo no trae error, usa el mensaje por defecto', async () => {
    const e = await errorDesdeRespuesta(respuesta(500, { cualquiera: 1 }), 'Algo falló');
    expect(e.message).toBe('Algo falló');
  });
});

describe('lanzarSiError', () => {
  it('no hace nada si la respuesta fue exitosa', async () => {
    await expect(lanzarSiError(respuesta(200, {}), 'x')).resolves.toBeUndefined();
    await expect(lanzarSiError(respuesta(204, null), 'x')).resolves.toBeUndefined();
  });

  it('lanza el error de la API si no fue exitosa', async () => {
    await expect(lanzarSiError(respuesta(403, errorApi('SIN_PERMISO', 'No tenés permiso para hacer esto.')), 'x'))
      .rejects.toMatchObject({ codigo: 'SIN_PERMISO', message: 'No tenés permiso para hacer esto.' });
  });
});

describe('sesión vencida', () => {
  it('avisa cuando la API responde NO_AUTENTICADO', async () => {
    const alVencer = jest.fn();
    const darDeBaja = registrarAlSesionVencida(alVencer);

    await errorDesdeRespuesta(respuesta(401, errorApi('NO_AUTENTICADO', 'Tenés que ingresar.')), 'x');
    expect(alVencer).toHaveBeenCalledTimes(1);
    darDeBaja();
  });

  it('no avisa con otros errores, ni con credenciales inválidas', async () => {
    const alVencer = jest.fn();
    const darDeBaja = registrarAlSesionVencida(alVencer);

    await errorDesdeRespuesta(respuesta(401, errorApi('CREDENCIALES_INVALIDAS', 'Mal.')), 'x');
    await errorDesdeRespuesta(respuesta(403, errorApi('SIN_PERMISO', 'No.')), 'x');
    expect(alVencer).not.toHaveBeenCalled();
    darDeBaja();
  });

  it('el aviso se puede cancelar', async () => {
    const alVencer = jest.fn();
    const darDeBaja = registrarAlSesionVencida(alVencer);
    darDeBaja();

    await errorDesdeRespuesta(respuesta(401, errorApi('NO_AUTENTICADO', 'x')), 'x');
    expect(alVencer).not.toHaveBeenCalled();
  });
});

describe('ayudas para las pantallas', () => {
  it('errorSinSesion tiene el código SIN_SESION (propio de la app) y no es NO_AUTENTICADO', () => {
    const e = errorSinSesion();
    expect(e.codigo).toBe('SIN_SESION');
    expect(e.estado).toBeUndefined();
  });

  it('codigoDe sólo lee el código de un ErrorDeApi', () => {
    expect(codigoDe(new ErrorDeApi('x', 'TURNO_OCUPADO'))).toBe('TURNO_OCUPADO');
    expect(codigoDe(new Error('x'))).toBeUndefined();
    expect(codigoDe('texto')).toBeUndefined();
  });

  it('mensajeDe devuelve el mensaje del error o el de respaldo', () => {
    expect(mensajeDe(new Error('Falló la red'), 'respaldo')).toBe('Falló la red');
    expect(mensajeDe(new Error(''), 'respaldo')).toBe('respaldo');
    expect(mensajeDe('algo raro', 'respaldo')).toBe('respaldo');
    expect(mensajeDe(null, 'respaldo')).toBe('respaldo');
  });
});
