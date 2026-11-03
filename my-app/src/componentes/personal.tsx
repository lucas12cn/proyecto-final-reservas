import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../hooks/use-theme';
import { desplazarDia, etiquetaDelDia } from '../servicios/turnos';
import { Espacio } from '../tipos';

// Piezas de formulario que comparten las pantallas del personal (bloqueos y reservas fijas).

/** ‹ Hoy 03/11 › : elige un día. `minimo` (AAAA-MM-DD) impide ir hacia atrás de esa fecha. */
export function SelectorDia({ fecha, minimo, onCambiar }: { fecha: string; minimo?: string; onCambiar: (fecha: string) => void }) {
  const { paleta } = useTema();
  const puedeRetroceder = !minimo || fecha > minimo; // las fechas AAAA-MM-DD se comparan como texto

  return (
    <View style={estilos.fila}>
      <TouchableOpacity
        disabled={!puedeRetroceder}
        onPress={() => onCambiar(desplazarDia(fecha, -1))}
        style={[estilos.boton, { borderColor: paleta.border, opacity: puedeRetroceder ? 1 : 0.4 }]}
      >
        <Ionicons name="chevron-back" size={20} color={paleta.text} />
      </TouchableOpacity>
      <Text style={[estilos.valor, { color: paleta.text, minWidth: 130 }]}>{etiquetaDelDia(fecha)}</Text>
      <TouchableOpacity
        onPress={() => onCambiar(desplazarDia(fecha, 1))}
        style={[estilos.boton, { borderColor: paleta.border }]}
      >
        <Ionicons name="chevron-forward" size={20} color={paleta.text} />
      </TouchableOpacity>
    </View>
  );
}

/** − 14:00 + : sube o baja un número entre `min` y `max`. */
export function Paso({ valor, min, max, onCambiar, formato }: {
  valor: number; min: number; max: number; onCambiar: (valor: number) => void; formato?: (valor: number) => string;
}) {
  const { paleta } = useTema();
  return (
    <View style={estilos.fila}>
      <TouchableOpacity
        disabled={valor <= min}
        onPress={() => onCambiar(valor - 1)}
        style={[estilos.boton, { borderColor: paleta.border, opacity: valor <= min ? 0.4 : 1 }]}
      >
        <Ionicons name="remove" size={20} color={paleta.text} />
      </TouchableOpacity>
      <Text style={[estilos.valor, { color: paleta.text, minWidth: 70 }]}>{formato ? formato(valor) : valor}</Text>
      <TouchableOpacity
        disabled={valor >= max}
        onPress={() => onCambiar(valor + 1)}
        style={[estilos.boton, { borderColor: paleta.border, opacity: valor >= max ? 0.4 : 1 }]}
      >
        <Ionicons name="add" size={20} color={paleta.text} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Lista de espacios agrupados por complejo. Con `unico` se elige uno (círculo); si no, varios
 * (casilla), con un atajo "Todas" por complejo (útil para suspender todo el predio por lluvia).
 */
export function ListaEspacios({ espacios, seleccionados, onCambiar, unico }: {
  espacios: Espacio[]; seleccionados: string[]; onCambiar: (ids: string[]) => void; unico?: boolean;
}) {
  const { paleta } = useTema();

  const porComplejo: Record<string, Espacio[]> = {};
  espacios.forEach((e) => {
    (porComplejo[e.complejo] = porComplejo[e.complejo] ?? []).push(e);
  });

  const alternar = (id: string) => {
    if (unico) return onCambiar([id]);
    onCambiar(seleccionados.includes(id) ? seleccionados.filter((x) => x !== id) : [...seleccionados, id]);
  };

  const alternarComplejo = (ids: string[]) => {
    const todosElegidos = ids.every((id) => seleccionados.includes(id));
    onCambiar(todosElegidos ? seleccionados.filter((id) => !ids.includes(id)) : Array.from(new Set([...seleccionados, ...ids])));
  };

  return (
    <View>
      {Object.entries(porComplejo).map(([complejo, lista]) => {
        const ids = lista.map((e) => e.id);
        const todosElegidos = ids.every((id) => seleccionados.includes(id));
        return (
          <View key={complejo} style={{ marginBottom: 10 }}>
            <View style={estilos.encabezadoComplejo}>
              <Text style={{ color: paleta.muted, fontWeight: 'bold', flex: 1 }}>{complejo}</Text>
              {!unico && (
                <TouchableOpacity onPress={() => alternarComplejo(ids)}>
                  <Text style={{ color: paleta.accent, fontWeight: 'bold' }}>{todosElegidos ? 'Ninguna' : 'Todas'}</Text>
                </TouchableOpacity>
              )}
            </View>
            {lista.map((e) => {
              const elegido = seleccionados.includes(e.id);
              const icono = unico ? (elegido ? 'radio-button-on' : 'radio-button-off') : elegido ? 'checkbox' : 'square-outline';
              return (
                <TouchableOpacity key={e.id} style={estilos.filaEspacio} onPress={() => alternar(e.id)}>
                  <Ionicons name={icono} size={22} color={elegido ? paleta.accent : paleta.muted} />
                  <Text style={{ color: paleta.text, flex: 1 }}>{e.nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  valor: { fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  encabezadoComplejo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  filaEspacio: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
});
