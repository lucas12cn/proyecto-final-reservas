import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '../src/providers/ThemeProvider';
import { ListaEspacios, Paso, SelectorDia } from '../src/componentes/personal';

// Las piezas usan el tema (useTema): se envuelven en su proveedor
const conTema = (ui: React.ReactElement) => <ThemeProvider>{ui}</ThemeProvider>;

describe('Paso', () => {
  it('muestra el valor con el formato y sube o baja de a uno', async () => {
    const alCambiar = jest.fn();
    await render(conTema(<Paso valor={14} min={8} max={23} onCambiar={alCambiar} formato={(h) => `${h}:00`} />));

    expect(screen.getByText('14:00')).toBeTruthy();
    await fireEvent.press(screen.getByText('icono:add'));
    expect(alCambiar).toHaveBeenLastCalledWith(15);
    await fireEvent.press(screen.getByText('icono:remove'));
    expect(alCambiar).toHaveBeenLastCalledWith(13);
  });

  it('no baja del mínimo ni sube del máximo', async () => {
    const alCambiar = jest.fn();
    const { rerender } = await render(conTema(<Paso valor={8} min={8} max={23} onCambiar={alCambiar} />));
    await fireEvent.press(screen.getByText('icono:remove'));
    expect(alCambiar).not.toHaveBeenCalled();

    await rerender(conTema(<Paso valor={23} min={8} max={23} onCambiar={alCambiar} />));
    await fireEvent.press(screen.getByText('icono:add'));
    expect(alCambiar).not.toHaveBeenCalled();
  });
});

describe('SelectorDia', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 3, 12, 0)); // 03/11/2026
  });
  afterEach(() => jest.useRealTimers());

  it('avanza y retrocede de a un día', async () => {
    const alCambiar = jest.fn();
    await render(conTema(<SelectorDia fecha="2026-11-10" onCambiar={alCambiar} />));

    await fireEvent.press(screen.getByText('icono:chevron-forward'));
    expect(alCambiar).toHaveBeenLastCalledWith('2026-11-11');
    await fireEvent.press(screen.getByText('icono:chevron-back'));
    expect(alCambiar).toHaveBeenLastCalledWith('2026-11-09');
  });

  it('con un mínimo no deja ir hacia atrás de esa fecha', async () => {
    const alCambiar = jest.fn();
    await render(conTema(<SelectorDia fecha="2026-11-03" minimo="2026-11-03" onCambiar={alCambiar} />));

    await fireEvent.press(screen.getByText('icono:chevron-back'));
    expect(alCambiar).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('icono:chevron-forward'));
    expect(alCambiar).toHaveBeenCalledWith('2026-11-04');
  });

  it('muestra la etiqueta del día (Hoy, Mañana…)', async () => {
    await render(conTema(<SelectorDia fecha="2026-11-03" onCambiar={() => {}} />));
    expect(screen.getByText('Hoy 03/11')).toBeTruthy();
  });
});

describe('ListaEspacios', () => {
  const espacios = [
    { id: 'esp-01', nombre: 'Cancha 1 — Fútbol 5', complejo: 'Polideportivo Municipal' },
    { id: 'esp-02', nombre: 'Cancha 2 — Fútbol 5', complejo: 'Polideportivo Municipal' },
    { id: 'esp-10', nombre: 'Cancha de tenis 1', complejo: 'Parque Berduc' },
  ] as any[];

  it('agrupa por complejo', async () => {
    await render(conTema(<ListaEspacios espacios={espacios} seleccionados={[]} onCambiar={() => {}} />));
    expect(screen.getByText('Polideportivo Municipal')).toBeTruthy();
    expect(screen.getByText('Parque Berduc')).toBeTruthy();
    expect(screen.getByText('Cancha 2 — Fútbol 5')).toBeTruthy();
  });

  it('en modo múltiple suma y quita espacios', async () => {
    const alCambiar = jest.fn();
    const { rerender } = await render(conTema(<ListaEspacios espacios={espacios} seleccionados={[]} onCambiar={alCambiar} />));

    await fireEvent.press(screen.getByText('Cancha 1 — Fútbol 5'));
    expect(alCambiar).toHaveBeenLastCalledWith(['esp-01']);

    await rerender(conTema(<ListaEspacios espacios={espacios} seleccionados={['esp-01']} onCambiar={alCambiar} />));
    await fireEvent.press(screen.getByText('Cancha 1 — Fútbol 5')); // vuelve a tocar: lo quita
    expect(alCambiar).toHaveBeenLastCalledWith([]);
  });

  it('"Todas" elige todo un complejo y "Ninguna" lo quita (atajo para suspender un predio por lluvia)', async () => {
    const alCambiar = jest.fn();
    const { rerender } = await render(conTema(<ListaEspacios espacios={espacios} seleccionados={[]} onCambiar={alCambiar} />));

    await fireEvent.press(screen.getAllByText('Todas')[0]); // Polideportivo Municipal
    expect(alCambiar).toHaveBeenLastCalledWith(['esp-01', 'esp-02']);

    await rerender(conTema(<ListaEspacios espacios={espacios} seleccionados={['esp-01', 'esp-02', 'esp-10']} onCambiar={alCambiar} />));
    await fireEvent.press(screen.getAllByText('Ninguna')[0]);
    expect(alCambiar).toHaveBeenLastCalledWith(['esp-10']); // sólo quita el complejo tocado
  });

  it('en modo único reemplaza la elección y no ofrece "Todas"', async () => {
    const alCambiar = jest.fn();
    await render(conTema(<ListaEspacios unico espacios={espacios} seleccionados={['esp-01']} onCambiar={alCambiar} />));

    expect(screen.queryByText('Todas')).toBeNull();
    await fireEvent.press(screen.getByText('Cancha de tenis 1'));
    expect(alCambiar).toHaveBeenLastCalledWith(['esp-10']);
  });
});
