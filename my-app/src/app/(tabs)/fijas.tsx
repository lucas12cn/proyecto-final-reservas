import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal,
  ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import { obtenerFijas, crearFijaApi, darDeBajaFijaApi, obtenerEspacios } from '../../servicios/reservas';
import { aFechaLocal, desplazarDia, diaDeLaSemana, DIAS_CORTOS, DIAS_LARGOS, dosDigitos } from '../../servicios/turnos';
import { mensajeDe } from '../../servicios/errores';
import { ListaEspacios, Paso, SelectorDia } from '../../componentes/personal';
import { Espacio, ReservaFija } from '../../tipos';

const hora = (h: number) => `${dosDigitos(h)}:00`;
const formatoFecha = (fecha: string) => fecha.split('-').reverse().join('/'); // AAAA-MM-DD → DD/MM/AAAA

export default function FijasScreen() {
  const { paleta } = useTema();
  const { usuario } = useAuth();
  // Las reservas fijas las maneja sólo el administrador (D6); la API además responde 403 al resto.
  const esAdmin = usuario?.rol === 'administrador';

  const [fijas, setFijas] = useState<ReservaFija[]>([]);
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
      const [lista, catalogo] = await Promise.all([obtenerFijas(), obtenerEspacios()]);
      setFijas([...lista].sort((a, b) => a.espacioId.localeCompare(b.espacioId) || a.dia - b.dia || a.inicio.localeCompare(b.inicio)));
      setEspacios(catalogo);
    } catch (e) {
      setError(mensajeDe(e, 'No se pudieron cargar las reservas fijas.'));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { if (esAdmin) cargar(); }, [esAdmin]));

  const darDeBaja = (f: ReservaFija) => {
    Alert.alert(
      'Dar de baja',
      `${f.titular}\n${nombreDe(f.espacioId)} · ${DIAS_LARGOS[f.dia]} ${f.inicio} a ${f.fin}\n\nEl horario deja de estar ocupado y vuelve a poder reservarse.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: async () => {
            try {
              await darDeBajaFijaApi(f.id);
              cargar('refresco');
            } catch (e) {
              Alert.alert('No se pudo dar de baja', mensajeDe(e, 'Probá de nuevo.'));
            }
          },
        },
      ]
    );
  };

  if (!esAdmin) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background, padding: 24 }]}>
        <Ionicons name="lock-closed-outline" size={60} color={paleta.muted} style={{ marginBottom: 20 }} />
        <Text style={{ color: paleta.text, textAlign: 'center', fontSize: 16 }}>Las reservas fijas las administra sólo el administrador.</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.background }]}>
      <View style={estilos.encabezado}>
        <Text style={{ color: paleta.muted, flex: 1 }}>Turnos que se repiten todas las semanas (clubes, escuelitas).</Text>
        <TouchableOpacity style={[estilos.botonNuevo, { backgroundColor: paleta.accent }]} onPress={() => setFormVisible(true)}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Nueva</Text>
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
          data={fijas}
          keyExtractor={(f) => f.id}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          refreshing={refrescando}
          onRefresh={() => { setRefrescando(true); cargar('refresco'); }}
          ListEmptyComponent={<Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 40 }}>No hay reservas fijas.</Text>}
          renderItem={({ item }) => (
            <View style={[estilos.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: paleta.text, fontWeight: 'bold', fontSize: 16 }}>{item.titular}</Text>
                <Text style={{ color: paleta.text, marginTop: 2 }}>{nombreDe(item.espacioId)}</Text>
                <Text style={{ color: paleta.text, marginTop: 2 }}>{DIAS_LARGOS[item.dia]} · {item.inicio} a {item.fin}</Text>
                <Text style={{ color: paleta.muted, marginTop: 2, fontSize: 12 }}>
                  Desde {formatoFecha(item.desde)}{item.hasta ? ` hasta ${formatoFecha(item.hasta)}` : ' · sin fecha de fin'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => darDeBaja(item)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <FormularioFija
        visible={formVisible}
        espacios={espacios}
        onCerrar={() => setFormVisible(false)}
        onCreada={() => { setFormVisible(false); cargar('refresco'); }}
      />
    </View>
  );
}

function FormularioFija({ visible, espacios, onCerrar, onCreada }: {
  visible: boolean; espacios: Espacio[]; onCerrar: () => void; onCreada: () => void;
}) {
  const { paleta } = useTema();
  const hoy = aFechaLocal(new Date());

  const [elegido, setElegido] = useState<string[]>([]);
  const [titular, setTitular] = useState('');
  const [dia, setDia] = useState(diaDeLaSemana(hoy));
  const [inicio, setInicio] = useState(19);
  const [fin, setFin] = useState(20);
  const [desde, setDesde] = useState(hoy);
  const [sinFin, setSinFin] = useState(true);
  const [hasta, setHasta] = useState(hoy);
  const [enviando, setEnviando] = useState(false);

  // Al abrir el formulario se parte de cero
  useEffect(() => {
    if (!visible) return;
    const hoyAhora = aFechaLocal(new Date());
    setElegido([]); setTitular(''); setDia(diaDeLaSemana(hoyAhora)); setInicio(19); setFin(20);
    setDesde(hoyAhora); setSinFin(true); setHasta(hoyAhora); setEnviando(false);
  }, [visible]);

  const cambiarInicio = (h: number) => {
    setInicio(h);
    if (fin <= h) setFin(h + 1);
  };

  const cambiarDesde = (fecha: string) => {
    setDesde(fecha);
    if (hasta < fecha) setHasta(fecha); // "hasta" nunca antes que "desde"
  };

  const enviar = async () => {
    if (elegido.length === 0) return Alert.alert('Falta un dato', 'Elegí el espacio.');
    if (!titular.trim()) return Alert.alert('Falta un dato', 'Escribí quién tiene la reserva fija.');

    setEnviando(true);
    try {
      await crearFijaApi({
        espacioId: elegido[0],
        titular: titular.trim(),
        dia,
        inicio: hora(inicio),
        fin: hora(fin),
        desde,
        hasta: sinFin ? null : hasta,
      });
      Alert.alert('Reserva fija creada', 'Desde ahora ese horario figura como ocupado en la grilla.');
      onCreada();
    } catch (e) {
      // Por ejemplo: FIJA_SUPERPUESTA o CONFLICTO_CON_RESERVAS (hay reservas que hay que resolver a mano)
      Alert.alert('No se pudo crear', mensajeDe(e, 'Probá de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: paleta.background }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[estilos.cabeceraModal, { borderBottomColor: paleta.border }]}>
            <Text style={{ color: paleta.text, fontSize: 20, fontWeight: 'bold' }}>Nueva reserva fija</Text>
            <TouchableOpacity onPress={onCerrar} style={{ padding: 4 }}>
              <Ionicons name="close" size={26} color={paleta.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Espacio</Text>
            <ListaEspacios unico espacios={espacios} seleccionados={elegido} onCambiar={setElegido} />

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Titular</Text>
            <TextInput
              value={titular}
              onChangeText={setTitular}
              placeholder="Ej.: Grupo de los martes"
              placeholderTextColor={paleta.muted}
              maxLength={120}
              style={[estilos.entrada, { color: paleta.text, borderColor: paleta.border, backgroundColor: paleta.surface }]}
            />

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Día de la semana</Text>
            <View style={estilos.chips}>
              {DIAS_CORTOS.map((nombre, i) => (
                <TouchableOpacity
                  key={nombre}
                  onPress={() => setDia(i)}
                  style={[estilos.chip, { borderColor: paleta.border, backgroundColor: dia === i ? paleta.accent : 'transparent' }]}
                >
                  <Text style={{ color: dia === i ? '#fff' : paleta.text, fontWeight: 'bold' }}>{nombre}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Horario</Text>
            <View style={{ gap: 12 }}>
              <View style={estilos.filaSwitch}>
                <Text style={{ color: paleta.text }}>Desde</Text>
                <Paso valor={inicio} min={8} max={23} onCambiar={cambiarInicio} formato={hora} />
              </View>
              <View style={estilos.filaSwitch}>
                <Text style={{ color: paleta.text }}>Hasta</Text>
                <Paso valor={fin} min={inicio + 1} max={24} onCambiar={setFin} formato={hora} />
              </View>
            </View>

            <Text style={[estilos.etiqueta, { color: paleta.muted }]}>Vigencia desde</Text>
            <SelectorDia fecha={desde} minimo={hoy} onCambiar={cambiarDesde} />

            <View style={[estilos.filaSwitch, { marginTop: 18 }]}>
              <Text style={{ color: paleta.text, fontSize: 16 }}>Sin fecha de fin</Text>
              <Switch value={sinFin} onValueChange={setSinFin} />
            </View>
            {!sinFin && (
              <View style={{ marginTop: 12 }}>
                <Text style={[estilos.etiqueta, { color: paleta.muted, marginTop: 0 }]}>Vigencia hasta</Text>
                <SelectorDia fecha={hasta} minimo={desde} onCambiar={setHasta} />
              </View>
            )}

            <Text style={{ color: paleta.muted, fontSize: 12, marginTop: 16 }}>
              Si ya hay reservas en esos turnos, la API no la crea: hay que cancelarlas antes.
            </Text>

            <TouchableOpacity
              style={[estilos.botonPrincipal, { backgroundColor: paleta.accent, opacity: enviando ? 0.6 : 1 }]}
              onPress={enviar}
              disabled={enviando}
            >
              {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Crear reserva fija</Text>}
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
  entrada: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  botonPrincipal: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
});
