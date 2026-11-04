import { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import { obtenerReservasDelDia, obtenerEspacios, marcarAusenteApi, obtenerUsuarioApi } from '../../servicios/reservas';
import { aFechaLocal, desplazarDia, etiquetaDelDia, habilitadaParaAusenteDesde, leerTurnoId } from '../../servicios/turnos';
import { mensajeDe } from '../../servicios/errores';
import { Reserva, Usuario } from '../../tipos';

const dos = (n: number) => String(n).padStart(2, '0');
const horaLocal = (fecha: Date) => `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;

export default function AgendaScreen() {
  const { paleta } = useTema();
  const { usuario } = useAuth();
  // Sólo el personal ve la agenda; la API también lo exige (403 para un jugador).
  const esPersonal = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';

  const [fecha, setFecha] = useState(aFechaLocal(new Date()));
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [nombresEspacio, setNombresEspacio] = useState<Record<string, string>>({});
  const [contactos, setContactos] = useState<Record<string, Usuario>>({});
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marcando, setMarcando] = useState<string | null>(null);
  const [cargandoContacto, setCargandoContacto] = useState<string | null>(null);

  // Si el usuario cambia de día antes de que llegue una respuesta, la vieja se descarta
  const pedidoActual = useRef(0);

  const cargar = async (dia: string, modo: 'completo' | 'refresco' = 'completo') => {
    const pedido = ++pedidoActual.current;
    if (modo === 'completo') setCargando(true);
    setError(null);
    try {
      const [lista, espacios] = await Promise.all([obtenerReservasDelDia(dia), obtenerEspacios()]);
      if (pedido !== pedidoActual.current) return;

      const ordenadas = lista
        .filter((r) => r.estado !== 'cancelada')
        .sort((a, b) => (leerTurnoId(a.turnoId)?.inicio.getTime() ?? 0) - (leerTurnoId(b.turnoId)?.inicio.getTime() ?? 0));
      setReservas(ordenadas);
      setNombresEspacio(Object.fromEntries(espacios.map((e) => [e.id, e.nombre])));
    } catch (e) {
      if (pedido !== pedidoActual.current) return;
      setReservas([]);
      setError(mensajeDe(e, 'No se pudo cargar la agenda.'));
    } finally {
      if (pedido === pedidoActual.current) {
        setCargando(false);
        setRefrescando(false);
      }
    }
  };

  // Se recarga al abrir la pantalla y al cambiar de día
  useFocusEffect(
    useCallback(() => {
      if (esPersonal) cargar(fecha);
    }, [fecha, esPersonal])
  );

  const verContacto = async (usuarioId: string) => {
    setCargandoContacto(usuarioId);
    try {
      const datos = await obtenerUsuarioApi(usuarioId);
      setContactos((previos) => ({ ...previos, [usuarioId]: datos }));
    } catch (e) {
      Alert.alert('No se pudo cargar el contacto', mensajeDe(e, 'Probá de nuevo.'));
    } finally {
      setCargandoContacto(null);
    }
  };

  const marcarAusente = (reserva: Reserva) => {
    const turno = leerTurnoId(reserva.turnoId);
    Alert.alert(
      '¿No se presentó?',
      `${nombresEspacio[reserva.espacioId] ?? reserva.espacioId}${turno ? ` · ${turno.hora}` : ''}\n` +
        'Se le suma una ausencia al jugador. No se puede deshacer desde la app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Marcar ausente',
          style: 'destructive',
          onPress: async () => {
            setMarcando(reserva.id);
            try {
              const actualizada = await marcarAusenteApi(reserva.id);
              setReservas((previas) => previas.map((r) => (r.id === actualizada.id ? actualizada : r)));
            } catch (e) {
              Alert.alert('No se pudo marcar', mensajeDe(e, 'Probá de nuevo.'));
              cargar(fecha, 'refresco'); // por si el estado ya había cambiado (p. ej. ya había ingresado)
            } finally {
              setMarcando(null);
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
        <Text style={{ color: paleta.text, textAlign: 'center', fontSize: 16 }}>
          La agenda del día es sólo para el personal del complejo.
        </Text>
      </View>
    );
  }

  const confirmadas = reservas.filter((r) => r.estado === 'confirmada').length;
  const ingresaron = reservas.filter((r) => r.estado === 'cumplida').length;
  const ausentes = reservas.filter((r) => r.estado === 'ausente').length;

  const renderReserva = ({ item }: { item: Reserva }) => {
    const turno = leerTurnoId(item.turnoId);
    const horaFin = turno ? `${dos(parseInt(turno.hora, 10) + 1)}:00` : '';
    const contacto = contactos[item.usuarioId];
    const desde = habilitadaParaAusenteDesde(item.turnoId);
    const puedeMarcar = !!desde && desde.getTime() <= Date.now();

    const chip =
      item.estado === 'cumplida'
        ? { texto: item.ingresoEn ? `Ingresó ${horaLocal(new Date(item.ingresoEn))}` : 'Ingresó', color: '#16a34a' }
        : item.estado === 'ausente'
        ? { texto: 'No se presentó', color: '#dc2626' }
        : { texto: 'Reservada', color: '#2563eb' };

    return (
      <View style={[estilos.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
        <View style={estilos.filaSuperior}>
          <Text style={[estilos.hora, { color: paleta.text }]}>{turno ? `${turno.hora} – ${horaFin}` : '—'}</Text>
          <View style={[estilos.chip, { backgroundColor: chip.color + '22' }]}>
            <Text style={{ color: chip.color, fontWeight: 'bold', fontSize: 12 }}>{chip.texto}</Text>
          </View>
        </View>

        <Text style={{ color: paleta.text, fontSize: 16, fontWeight: '600', marginTop: 4 }}>
          {nombresEspacio[item.espacioId] ?? item.espacioId}
        </Text>
        <Text style={{ color: paleta.muted, marginTop: 2 }}>
          {item.cantidadPersonas} {item.cantidadPersonas === 1 ? 'persona' : 'personas'}
        </Text>

        {contacto ? (
          <View style={[estilos.contacto, { borderColor: paleta.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: paleta.text, fontWeight: '600' }}>{contacto.nombre}</Text>
              <Text style={{ color: paleta.muted }}>{contacto.telefono}</Text>
            </View>
            <TouchableOpacity
              style={[estilos.botonLlamar, { backgroundColor: paleta.accent }]}
              onPress={() => Linking.openURL(`tel:${contacto.telefono.replace(/\s/g, '')}`)}
            >
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Llamar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[estilos.botonSecundario, { borderColor: paleta.border }]}
            onPress={() => verContacto(item.usuarioId)}
            disabled={cargandoContacto === item.usuarioId}
          >
            {cargandoContacto === item.usuarioId ? (
              <ActivityIndicator size="small" color={paleta.accent} />
            ) : (
              <Text style={{ color: paleta.text }}>Ver contacto</Text>
            )}
          </TouchableOpacity>
        )}

        {item.estado === 'confirmada' && (
          <>
            <TouchableOpacity
              style={[estilos.botonAusente, { opacity: puedeMarcar && marcando !== item.id ? 1 : 0.4 }]}
              onPress={() => marcarAusente(item)}
              disabled={!puedeMarcar || marcando === item.id}
            >
              {marcando === item.id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>No se presentó</Text>
              )}
            </TouchableOpacity>
            {!puedeMarcar && desde && (
              <Text style={{ color: paleta.muted, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                Se puede marcar desde las {horaLocal(desde)}
              </Text>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.background }]}>
      {/* Selector de día */}
      <View style={estilos.selectorDia}>
        <TouchableOpacity onPress={() => setFecha(desplazarDia(fecha, -1))} style={estilos.flecha}>
          <Ionicons name="chevron-back" size={24} color={paleta.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFecha(aFechaLocal(new Date()))}>
          <Text style={{ color: paleta.text, fontSize: 18, fontWeight: 'bold' }}>{etiquetaDelDia(fecha)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFecha(desplazarDia(fecha, 1))} style={estilos.flecha}>
          <Ionicons name="chevron-forward" size={24} color={paleta.text} />
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color={paleta.accent} />
        </View>
      ) : error ? (
        <View style={[estilos.centrado, { padding: 24 }]}>
          <Text style={{ color: paleta.text, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity style={[estilos.botonLlamar, { backgroundColor: paleta.accent }]} onPress={() => cargar(fecha)}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reservas}
          keyExtractor={(r) => r.id}
          renderItem={renderReserva}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          refreshing={refrescando}
          onRefresh={() => {
            setRefrescando(true);
            cargar(fecha, 'refresco');
          }}
          ListHeaderComponent={
            <Text style={{ color: paleta.muted, marginBottom: 12 }}>
              {confirmadas} por llegar · {ingresaron} ingresaron · {ausentes} ausentes
            </Text>
          }
          ListEmptyComponent={
            <Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 40 }}>No hay reservas para este día.</Text>
          }
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectorDia: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  flecha: { padding: 6 },
  tarjeta: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  filaSuperior: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hora: { fontSize: 18, fontWeight: 'bold' },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  contacto: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  botonLlamar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  botonSecundario: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 12 },
  botonAusente: { backgroundColor: '#dc2626', borderRadius: 10, paddingVertical: 11, alignItems: 'center', marginTop: 10 },
});
