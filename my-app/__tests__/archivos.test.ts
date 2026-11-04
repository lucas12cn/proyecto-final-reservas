// La API nueva de expo-file-system (File, Paths) se reemplaza por una simulación en memoria.
const mockArchivos = new Map<string, { exists: boolean; borrado: boolean }>();
const mockDescarga = jest.fn();

jest.mock('expo-file-system', () => {
  class File {
    nombre: string;
    constructor(_dir: unknown, nombre: string) {
      this.nombre = nombre;
      if (!mockArchivos.has(nombre)) mockArchivos.set(nombre, { exists: false, borrado: false });
    }
    get exists() { return mockArchivos.get(this.nombre)!.exists; }
    get uri() { return `file:///documentos/${this.nombre}`; }
    delete() { const f = mockArchivos.get(this.nombre)!; f.exists = false; f.borrado = true; }
    static async downloadFileAsync(url: string, destino: File) { return mockDescarga(url, destino); }
  }
  return { File, Paths: { document: 'documentos' } };
});

import { archivoGuardado, guardarArchivo, nombreDeCache } from '../src/servicios/archivos';

beforeEach(() => { mockArchivos.clear(); mockDescarga.mockReset(); });

describe('nombreDeCache', () => {
  it('lleva el prefijo y la extensión de la URL', () => {
    expect(nombreDeCache('esp_img_esp-02', 'http://192.168.1.6:3000/archivos/esp-02-1.jpg')).toMatch(/^esp_img_esp-02_[a-z0-9]+\.jpg$/);
    expect(nombreDeCache('esp_vid_esp-02', 'http://192.168.1.6:3000/archivos/esp-02.mp4')).toMatch(/\.mp4$/);
  });

  it('no depende del servidor: cambiar de IP no invalida lo guardado', () => {
    const a = nombreDeCache('x', 'http://192.168.1.6:3000/archivos/foto.jpg');
    const b = nombreDeCache('x', 'https://mi-api.onrender.com/archivos/foto.jpg');
    expect(a).toBe(b);
  });

  it('cambia si cambia la ruta (otro archivo o una versión nueva)', () => {
    const a = nombreDeCache('x', 'http://h/archivos/foto-1.jpg');
    const b = nombreDeCache('x', 'http://h/archivos/foto-2.jpg');
    expect(a).not.toBe(b);
  });

  it('ignora la query al buscar la extensión y usa "bin" si no hay', () => {
    expect(nombreDeCache('x', 'http://h/archivos/foto.png?v=3')).toMatch(/\.png$/);
    expect(nombreDeCache('x', 'http://h/archivos/sin-extension')).toMatch(/\.bin$/);
  });

  it('es determinístico', () => {
    const url = 'http://h/archivos/foto.jpg';
    expect(nombreDeCache('x', url)).toBe(nombreDeCache('x', url));
  });
});

describe('archivoGuardado', () => {
  it('devuelve null si el archivo no existe y la URI si existe', () => {
    expect(archivoGuardado('a.jpg')).toBeNull();
    mockArchivos.set('a.jpg', { exists: true, borrado: false });
    expect(archivoGuardado('a.jpg')).toBe('file:///documentos/a.jpg');
  });
});

describe('guardarArchivo', () => {
  it('descarga si todavía no está y devuelve la URI local', async () => {
    mockDescarga.mockImplementation(async (_url: string, destino: any) => {
      mockArchivos.get(destino.nombre)!.exists = true;
    });
    await expect(guardarArchivo('http://h/archivos/a.jpg', 'a.jpg')).resolves.toBe('file:///documentos/a.jpg');
    expect(mockDescarga).toHaveBeenCalledTimes(1);
    expect(mockDescarga.mock.calls[0][0]).toBe('http://h/archivos/a.jpg');
  });

  it('no vuelve a descargar si ya está guardado', async () => {
    mockArchivos.set('a.jpg', { exists: true, borrado: false });
    await expect(guardarArchivo('http://h/archivos/a.jpg', 'a.jpg')).resolves.toBe('file:///documentos/a.jpg');
    expect(mockDescarga).not.toHaveBeenCalled();
  });

  it('si la descarga falla devuelve null y borra el archivo incompleto', async () => {
    mockDescarga.mockImplementation(async (_url: string, destino: any) => {
      mockArchivos.get(destino.nombre)!.exists = true; // quedó a medio escribir
      throw new Error('se cortó la conexión');
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    await expect(guardarArchivo('http://h/archivos/a.jpg', 'a.jpg')).resolves.toBeNull();
    expect(mockArchivos.get('a.jpg')).toMatchObject({ exists: false, borrado: true });
    log.mockRestore();
  });
});
