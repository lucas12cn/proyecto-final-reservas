import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import QRCode from 'react-native-qrcode-svg';
import { useTema } from '../../hooks/use-theme';
import { obtenerEspacioPorId, crearReserva } from '../../servicios/reservas';
import { codigoDe, mensajeDe } from '../../servicios/errores';
import { Espacio } from '../../tipos';

export default function ConfirmarReservaScreen() {
  // 1. Agregamos turnoId a los parámetros que recibimos de la grilla
  const { id, fecha, hora, turnoId } = useLocalSearchParams<{ id: string, fecha: string, hora: string, turnoId: string }>();
  const { paleta } = useTema();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [personas, setPersonas] = useState(1); // cuántos van a jugar (1 a la capacidad del espacio)
  const [confirmado, setConfirmado] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    if (!id) return;
    const data = await obtenerEspacioPorId(id);
    setEspacio(data);
    if (data) setPersonas(data.capacidad); // por defecto, el espacio lleno; se puede bajar
    setCargando(false);
  };

  const confirmarReservaApi = async () => {
    setProcesando(true);
    try {
      // El turnoId viene de la grilla; la cantidad la elige el usuario (máximo: la capacidad)
      const reservaGenerada = await crearReserva(turnoId as string, personas);
      setQrData(reservaGenerada.codigoQr);
      setConfirmado(true);
    } catch (error) {
      const codigo = codigoDe(error);
      if (codigo === 'SIN_SESION') {
        // No hay sesión guardada: se ofrece ir a ingresar.
        Alert.alert(
          'Falta iniciar sesión',
          'Tenés que estar logueado para poder reservar una cancha.',
          [
            { text: 'Ahora no', style: 'cancel' },
            { text: 'Ingresar', onPress: () => router.push('/login') },
          ]
        );
      } else if (codigo === 'NO_AUTENTICADO') {
        // La sesión venció: el AuthContext ya avisó y llevó al ingreso.
      } else if (codigo === 'TURNO_OCUPADO' || codigo === 'TURNO_NO_DISPONIBLE' || codigo === 'TURNO_PASADO') {
        // El turno cambió mientras tanto: se vuelve a la grilla (que se recarga sola).
        Alert.alert('No se pudo reservar', mensajeDe(error, 'Ese turno ya no está disponible.'), [
          { text: 'Ver otros turnos', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('No se pudo reservar', mensajeDe(error, 'Ocurrió un error. Probá de nuevo.'));
      }
    } finally {
      setProcesando(false);
    }
  };

  if (cargando) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background }]}>
        <ActivityIndicator size="large" color={paleta.accent} />
      </View>
    );
  }

  if (!espacio) return null;

  if (confirmado) {
    return (
      <SafeAreaView style={[estilos.centrado, { backgroundColor: paleta.background, padding: 20 }]}>
        <Ionicons name="checkmark-circle" size={80} color="#10b981" />
        <Text style={[estilos.tituloExito, { color: paleta.text }]}>¡Reserva Confirmada!</Text>
        <Text style={{ color: paleta.muted, textAlign: 'center', marginBottom: 30 }}>
          Te esperamos el {fecha} a las {hora} en {espacio.complejo}.
        </Text>

        <View style={[estilos.cajaQR, { backgroundColor: 'white' }]}>
          {qrData ? (
            <QRCode value={qrData} size={150} />
          ) : (
            <Ionicons name="qr-code" size={150} color="black" />
          )}
          <Text style={estilos.textoQR}>Escaneá este código en la puerta</Text>
        </View>

        <TouchableOpacity 
          style={[estilos.botonVolver, { backgroundColor: paleta.accent }]}
          onPress={() => router.navigate('/(tabs)/espacios')}
        >
          <Text style={estilos.textoBoton}>Volver al Catálogo</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top']}>
      <View style={estilos.cabecera}>
        <TouchableOpacity onPress={() => router.back()} style={estilos.botonIcono}>
          <Ionicons name="arrow-back" size={24} color={paleta.text} />
        </TouchableOpacity>
        <Text style={[estilos.tituloCabecera, { color: paleta.text }]}>Confirmar Reserva</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={estilos.contenedor}>
        <Text style={[estilos.subtitulo, { color: paleta.text }]}>Resumen de tu turno</Text>

        <View style={[estilos.tarjetaResumen, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
          <View style={estilos.filaResumen}>
            <Ionicons name="calendar-outline" size={20} color={paleta.muted} />
            <Text style={[estilos.textoFila, { color: paleta.text }]}>{fecha}</Text>
          </View>
          <View style={estilos.filaResumen}>
            <Ionicons name="time-outline" size={20} color={paleta.muted} />
            <Text style={[estilos.textoFila, { color: paleta.text }]}>{hora} (1 hora)</Text>
          </View>
          <View style={estilos.filaResumen}>
            <Ionicons name="location-outline" size={20} color={paleta.muted} />
            <Text style={[estilos.textoFila, { color: paleta.text }]}>{espacio.nombre}</Text>
          </View>
          <View style={estilos.filaResumen}>
            <Ionicons name="people-outline" size={20} color={paleta.muted} />
            <Text style={[estilos.textoFila, { color: paleta.text, flex: 1 }]}>
              Personas <Text style={{ color: paleta.muted, fontWeight: '400' }}>(máx. {espacio.capacidad})</Text>
            </Text>
            <View style={estilos.selectorPersonas}>
              <TouchableOpacity
                style={[estilos.botonPersonas, { borderColor: paleta.border, opacity: personas <= 1 ? 0.4 : 1 }]}
                onPress={() => setPersonas(p => Math.max(1, p - 1))}
                disabled={personas <= 1}
              >
                <Ionicons name="remove" size={20} color={paleta.text} />
              </TouchableOpacity>
              <Text style={[estilos.cantidadPersonas, { color: paleta.text }]}>{personas}</Text>
              <TouchableOpacity
                style={[estilos.botonPersonas, { borderColor: paleta.border, opacity: personas >= espacio.capacidad ? 0.4 : 1 }]}
                onPress={() => setPersonas(p => Math.min(espacio.capacidad, p + 1))}
                disabled={personas >= espacio.capacidad}
              >
                <Ionicons name="add" size={20} color={paleta.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={[estilos.separador, { backgroundColor: paleta.border }]} />
          
          <View style={estilos.filaTotal}>
            <Text style={[estilos.textoTotal, { color: paleta.text }]}>Precio del turno:</Text>
            <Text style={[estilos.precioTotal, { color: paleta.accent }]}>${espacio.precioPorHora}</Text>
          </View>
        </View>

        <Text style={[estilos.nota, { color: paleta.muted }]}>
          El pago se realiza en el complejo antes de ingresar a la cancha. Presentá el código QR que se generará a continuación.
        </Text>
      </View>

      <View style={[estilos.pie, { backgroundColor: paleta.background, borderTopColor: paleta.border }]}>
        <TouchableOpacity 
          style={[estilos.botonConfirmar, { backgroundColor: procesando ? paleta.muted : paleta.accent }]} 
          onPress={confirmarReservaApi}
          disabled={procesando}
        >
          {procesando ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={estilos.textoBoton}>Confirmar Reserva</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pantalla: { flex: 1 },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  botonIcono: { padding: 5 },
  tituloCabecera: { fontSize: 18, fontWeight: 'bold' },
  contenedor: { padding: 20, flex: 1 },
  subtitulo: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  tarjetaResumen: { borderWidth: 1, borderRadius: 12, padding: 20, gap: 15 },
  filaResumen: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  textoFila: { fontSize: 16, fontWeight: '500' },
  separador: { height: 1, marginVertical: 5 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  textoTotal: { fontSize: 18, fontWeight: 'bold' },
  precioTotal: { fontSize: 22, fontWeight: 'bold' },
  nota: { marginTop: 20, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pie: { padding: 20, borderTopWidth: 1 },
  botonConfirmar: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  textoBoton: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  tituloExito: { fontSize: 24, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  cajaQR: { padding: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  textoQR: { marginTop: 10, fontSize: 14, color: '#666', fontWeight: '500' },
  botonVolver: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, marginTop: 40 },
  selectorPersonas: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  botonPersonas: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cantidadPersonas: { fontSize: 18, fontWeight: 'bold', minWidth: 24, textAlign: 'center' }
});