import { probarServidor } from '../src/servicios/servidor';

const fetchMock = jest.fn();
(globalThis as any).fetch = fetchMock;

const respuesta = (estado: number, cuerpo: unknown) =>
  ({ ok: estado < 400, status: estado, json: async () => cuerpo }) as unknown as Response;

beforeEach(() => fetchMock.mockReset());

describe('probarServidor', () => {
  it('es ok si /salud responde estado "ok"', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { datos: { estado: 'ok', motor: 'better-sqlite3' }, meta: null }));
    await expect(probarServidor('http://192.168.0.10:3000')).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe('http://192.168.0.10:3000/salud');
  });

  it('usa un tiempo máximo de espera (no se queda colgado en una IP equivocada)', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { datos: { estado: 'ok' } }));
    await probarServidor('http://192.168.0.10:3000');
    expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
  });

  it('si no hay conexión explica qué revisar', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const r = await probarServidor('http://192.168.9.9:3000');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.mensaje).toContain('misma red wifi');
  });

  it('si responde un error HTTP lo informa', async () => {
    fetchMock.mockResolvedValue(respuesta(502, {}));
    const r = await probarServidor('http://192.168.0.10:3000');
    expect(r).toEqual({ ok: false, mensaje: 'El servidor respondió con el error 502.' });
  });

  it('si responde otra cosa (no es la API de reservas) lo avisa', async () => {
    fetchMock.mockResolvedValue(respuesta(200, { hola: 'mundo' }));
    const r = await probarServidor('http://192.168.0.10:80');
    expect(r.ok === false && r.mensaje).toContain('no parece ser la API de reservas');
  });

  it('si la respuesta no es JSON tampoco la da por buena', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('no es JSON'); } } as unknown as Response);
    expect((await probarServidor('http://192.168.0.10:3000')).ok).toBe(false);
  });
});
