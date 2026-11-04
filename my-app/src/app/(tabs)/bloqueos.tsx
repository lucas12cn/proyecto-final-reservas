import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import {
  obtenerBloqueos, crearBloqueosApi, quitarBloqueoApi, obtenerEspacios, obtenerReservasDelDia,
} from '../../servicios/reservas';
import { aFechaLocal, dosDigitos, etiquetaDelDia } from '../../servicios/turnos';
import { reservasAfectadas } from '../../servicios/bloqueos';
import { mensajeDe } from '../../servicios/errores';
import { ListaEspacios, Paso, SelectorDia } from '../../componentes/personal';
import { Espacio, Reserva } from '../../tipos';
import { Bloqueo } from '../../tipos/personal';

const hora = (h: number) => `${dosDigitos(h)}:00`;
const tramo = (b: { inicio: string | null; fin: string | null }) =>
  b.inicio && b.fin ? `${b.inicio} a ${b.fin}` : 'Todo el día';

export default function BloqueosScreen() {
  const { paleta } = useTema();
  const { usuario } = useAuth();
  // Bloquear es del personal (encargado y administrador); la API además responde 403 a un jugador.
  const esPersonal = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';

  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);

  const nombreDe = (id: string) => espacios.find((e) => e.id === id)?.nombre ?? id;

  const cargar = async (modo: 'completo' | 'refresco' = 'completo') => {
    if (modo === 'completo') setCargando(true);
    setError(null);
    try {
      const [lista, catalogo] = await Promise.all([obtenerBloqueos(aFechaLocal(new Date())), obtenerEspacios()]);
      setBloqueos([...lista].sort((a, b) => (a.fecha + (a.inicio ?? '')).localeCompare(b.fecha + (b.inicio ?? '')) || a.espacioId.localeCompare(b.espacioId)));
      setEspacios(catalogo);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudieron cargar los bloqueos.'));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { if (esPersonal) cargar(); }, [esPersonal]));

  const quitar = (b: Bloqueo) => {
    Alert.alert(
      'Quitar bloqueo',
      `${nombreDe(b.espacioId)} · ${etiquetaDelDia(b.fecha)} · ${tramo(b)}\n\nEl turno vuelve a estar disponible. Las reservas que este bloqueo ya canceló siguen canceladas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              await quitarBloqueoApi(b.id);
              cargar('refresco');
            } catch (e) {
              Alert.alert('No se pudo quitar', mensajeDe(e, 'Probá de nuevo.'));
            }
          },
        },
      ]
    );
  };

  if (!esPersonal) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background, padding: 24 }]}>
        <Ionicons name="lock-closed-outline" size={60} color={paleta.muted} style={{ marginBottom: 20 }} />
        <Text style={{ color: paleta.text, textAlign: 'center', fontSize: 16 }}>Los bloqueos son sólo para el personal del complejo.</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.background }]}>
      <View style={estilos.encabezado}>
        <Text style={{ color: paleta.muted, flex: 1 }}>Turnos cerrados por lluvia, mantenimiento, etc.</Text>
        <TouchableOpacity style={[estilos.botonNuevo, { backgroundColor: paleta.accent }]} onPress={() => setFormVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={estilos.centrado}><ActivityIndicator size="large" color={paleta.accent} /></View>
      ) : error ? (
        <View style={[estilos.centrado, { padding: 24 }]}>
          <Text style={{ color: paleta.text, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity style={[estilos.botonNuevo, { backgroundColor: paleta.accent }]} onPress={() => cargar()}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bloqueos}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          refreshing={refrescando}
          onRefresh={() => { setRefrescando(true); cargar('refresco'); }}
          ListEmptyComponent={<Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 40 }}>No hay bloqueos programados.</Text>}
          renderItem={({ item }) => (
            <View style={[estilos.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: paleta.text, fontWeight: 'bold', fontSize: 16 }}>{nombreDe(item.espacioId)}</Text>
                <Text style={{ color: paleta.text, marginTop: 2 }}>{etiquetaDelDia(item.fecha)} · {tramo(item)}</Text>
                <Text style={{ color: paleta.muted, marginTop: 2 }}>{item.motivo}</Text>
              </View>
              <TouchableOpacity onPress={() => quitar(item)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <FormularioBloqueo
        visible={formVisible}
        espacios={espacios}
        onCerrar={() => setFormVisible(false)}
        onCreado={() => { setFormVisible(false); cargar('refresco'); }}
      />
    </View>
  );
}

function FormularioBloqueo({ visible, espacios, onCerrar, onCreado }: {
  visible: boolean; espacios: Espacio[]; onCerrar: () => void; onCreado: () => void;
}) {
  const { paleta } = useTema();
  const hoy = aFechaLocal(new Date());

  const [elegidos, setElegidos] = useState<string[]>([]);
  const [fecha, setFecha] = useState(hoy);
  const [todoElDia, setTodoElDia] = useState(true);
  const [inicio, setInicio] = useState(8);
  const [fin, setFin] = useState(12);
  const [motivo, setMotivo] = useState('');
  const [reservasDelDia, setReservasDelDia] = useState<Reserva[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pedidoActual = useRef(0);

  // Al abrir el formulario se parte de cero
  useEffect(() => {
    if (!visible) return;
    setElegidos([]); setFecha(aFechaLocal(new Date())); setTodoElDia(true);
    setInicio(8); setFin(12); setMotivo(''); setEnviando(false);
  }, [visible]);

  // Se consultan las reservas del día elegido para avisar cuántas se cancelarían
  useEffect(() => {
    if (!visible) return;
    const pedido = ++pedidoActual.current;
    setReservasDelDia(null);
    obtenerReservasDelDia(fecha)
      .then((lista) => { if (pedido === pedidoActual.current) setReservasDelDia(lista); })
      .catch(() => { if (pedido === pedidoActual.current) setReservasDelDia([]); });
  }, [visible, fecha]);

  const cambiarInicio = (h: number) => {
    setInicio(h);
    if (fin <= h) setFin(h + 1); // el fin siempre queda después del inicio
  };

  const afectadas = reservasAfectadas(reservasDelDia ?? [], elegidos, { todoElDia, inicio, fin });

  const enviar = () => {
    if (elegidos.length === 0) return Alert.alert('Falta un dato', 'Elegí al menos un espacio.');
    if (!motivo.trim()) return Alert.alert('Falta un dato', 'Escribí el motivo del bloqueo.');

    const resumen =
      `${elegidos.length} ${elegidos.length === 1 ? 'espacio' : 'espacios'} · ${etiquetaDelDia(fecha)} · ` +
      (todoElDia ? 'todo el día' : `${hora(inicio)} a ${hora(fin)}`);
    const consecuencia = afectadas.length > 0
      ? `Se van a cancelar ${afectadas.length} ${afectadas.length === 1 ? 'reserva confirmada' : 'reservas confirmadas'} y sus dueños recibirán un aviso con el motivo.`
      : 'No hay reservas confirmadas en esos turnos.';

    Alert.alert('¿Bloquear?', `${resumen}\n\n${consecuencia}`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Bloquear',
        style: 'destructive',
        onPress: async () => {
          setEnviando(true);
          try {
            await crearBloqueosApi({
              espacioIds: elegidos,
              fecha,
              inicio: todoElDia ? null : hora(inicio),
              fin: todoElDia ? null : hora(fin),
              motivo: motivo.trim(),
            });
            Alert.alert('Bloqueo creado', afectadas.length > 0 ? 'Se avisó a los jugadores afectados.' : 'Listo.');
            onCreado();
          } catch (e) {
            Alert.alert('No se pudo bloquear', mensajeDe(e, 'Probá de nuevo.'));
          } finally {
            setEnviando(false);
          }
        },
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: paleta.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[estilos.cabeceraModal, { borderBottomColor: paleta.border }]}>
            <Text style={{ color: paleta.text, fontSize: 20, fontWeight: 'bold' }}>Nuevo bloqueo</Text>
            <TouchableOpacity onPress={onCerrar} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color={paleta.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Espacios</Text>
            <ListaEspacios espacios={espacios} seleccionados={elegidos} onCambiar={setElegidos} />

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Día</Text>
            <SelectorDia fecha={fecha} minimo={hoy} onCambiar={setFecha} />

            <View style={[estilos.filaSwitch, { marginTop: 18 }]}>
              <Text style={{ color: paleta.text, fontSize: 16 }}>Todo el día</Text>
              <Switch value={todoElDia} onValueChange={setTodoElDia} />
            </View>

            {!todoElDia && (
              <View style={{ gap: 12, marginTop: 8 }}>
                <View style={estilos.filaSwitch}>
                  <Text style={{ color: paleta.text }}>Desde</Text>
                  <Paso valor={inicio} min={8} max={23} onCambiar={cambiarInicio} formato={hora} />
                </View>
                <View style={estilos.filaSwitch}>
                  <Text style={{ color: paleta.text }}>Hasta</Text>
                  <Paso valor={fin} min={inicio + 1} max={24} onCambiar={setFin} formato={hora} />
                </View>
              </View>
            )}

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Motivo (lo ven los jugadores)</Text>
            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Ej.: Cancha anegada"
              placeholderTextColor={paleta.muted}
              maxLength={200}
              multiline
              style={[estilos.entrada, { color: paleta.text, borderColor: paleta.border, backgroundColor: paleta.surface }]}
            />

            {elegidos.length > 0 && (
              <View style={[estilos.aviso, { borderColor: afectadas.length > 0 ? '#d97706' : paleta.border }]}>
                {reservasDelDia === null ? (
                  <Text style={{ color: paleta.muted }}>Revisando reservas del día…</Text>
                ) : afectadas.length > 0 ? (
                  <Text style={{ color: paleta.text }}>
                    ⚠️ {afectadas.length} {afectadas.length === 1 ? 'reserva confirmada se va' : 'reservas confirmadas se van'} a cancelar
                    y sus dueños recibirán un aviso.
                  </Text>
                ) : (
                  <Text style={{ color: paleta.muted }}>No hay reservas confirmadas en esos turnos.</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[estilos.botonPrincipal, { backgroundColor: '#dc2626', opacity: enviando ? 0.6 : 1 }]}
              onPress={enviar}
              disabled={enviando}
            >
              {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Bloquear</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingBottom: 8 },
  botonNuevo: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  cabeceraModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  etiqueta: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entrada: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 70, textAlignVertical: 'top', fontSize: 16 },
  aviso: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 16 },
  botonPrincipal: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
