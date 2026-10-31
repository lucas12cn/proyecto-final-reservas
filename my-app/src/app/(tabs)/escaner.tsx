import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { registrarIngresoApi, obtenerEspacios } from '../../servicios/reservas';
import { useTema } from '../../hooks/use-theme';

export default function EscanerScreen() {
  const { paleta } = useTema();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [escaneando, setEscaneando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  
  // Estados para manejar los espacios dinámicamente
  const [espacios, setEspacios] = useState<any[]>([]);
  const [espacioSeleccionado, setEspacioSeleccionado] = useState<string | null>(null);
  const [cargandoEspacios, setCargandoEspacios] = useState(true);

  useEffect(() => {
    inicializarEscaner();
  }, []);

  const inicializarEscaner = async () => {
    // 1. Validamos la identidad
    const tieneHardware = await LocalAuthentication.hasHardwareAsync();
    const tieneBiometria = await LocalAuthentication.isEnrolledAsync();

    if (tieneHardware && tieneBiometria) {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Validá tu identidad para escanear ingresos',
        fallbackLabel: 'Usar PIN'
      });

      if (!resultado.success) {
        Alert.alert('Acceso Denegado', 'Debes validar tu identidad para usar el escáner.', [
          { text: 'Volver', onPress: () => router.back() },
          { text: 'Reintentar', onPress: inicializarEscaner }
        ]);
        return;
      }
    }
    setAutenticado(true);

    // 2. Traemos las canchas de la API para que el encargado elija cuál controlar
    try {
      const listaEspacios = await obtenerEspacios();
      setEspacios(listaEspacios);
      if (listaEspacios.length > 0) {
        setEspacioSeleccionado(listaEspacios[0].id); // Seleccionamos la primera por defecto
      }
    } catch (error) {
      console.log("Error cargando espacios para el escáner", error);
    } finally {
      setCargandoEspacios(false);
    }
  };

  if (!autenticado || cargandoEspacios) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background }]}>
        <ActivityIndicator size="large" color={paleta.accent} />
        <Text style={{ color: paleta.text, marginTop: 15 }}>
          {!autenticado ? 'Validando identidad...' : 'Cargando complejos...'}
        </Text>
      </View>
    );
  }

  if (!permiso) {
    return <View style={[estilos.centrado, { backgroundColor: paleta.background }]} />;
  }

  if (!permiso.granted) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background }]}>
        <Ionicons name="camera-outline" size={60} color={paleta.muted} style={{ marginBottom: 20 }} />
        <Text style={{ color: paleta.text, textAlign: 'center', marginBottom: 20, fontSize: 16, paddingHorizontal: 20 }}>
          El encargado necesita acceso a la cámara para validar las reservas mediante código QR.
        </Text>
        <TouchableOpacity style={[estilos.botonPermiso, { backgroundColor: paleta.accent }]} onPress={pedirPermiso}>
          <Text style={estilos.textoBotonPermiso}>Otorgar Permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => router.back()}>
          <Text style={{ color: paleta.muted }}>Volver al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const manejarEscaneo = async ({ data }: { data: string }) => {
    if (escaneando || !espacioSeleccionado) return;
    setEscaneando(true);

    try {
      await registrarIngresoApi(data, espacioSeleccionado);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        "¡Ingreso Autorizado!", 
        `El código fue validado correctamente para esta cancha.`, 
        [{ text: "Escanear otro", onPress: () => setEscaneando(false) }]
      );
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      Alert.alert(
        "Ingreso Rechazado", 
        error.message || "Este código no es válido o no corresponde a esta cancha.", 
        [{ text: "Reintentar", onPress: () => setEscaneando(false) }]
      );
    }
  };

  return (
    <View style={estilos.pantalla}>
      <CameraView 
        style={StyleSheet.absoluteFill} 
        facing="back"
        onBarcodeScanned={escaneando ? undefined : manejarEscaneo}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      
      {/* CAPA SUPERIOR: Selector de Canchas */}
      <SafeAreaView style={estilos.capaSuperior}>
        <View style={estilos.cabeceraEscaner}>
          <TouchableOpacity style={estilos.botonCerrar} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          <Text style={estilos.tituloCapa}>Control de Ingreso</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={estilos.selectorContainer}>
          <Text style={estilos.labelSelector}>Estás escaneando para:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.scrollEspacios}>
            {espacios.map(e => (
              <TouchableOpacity
                key={e.id}
                style={[
                  estilos.chipEspacio, 
                  espacioSeleccionado === e.id ? { backgroundColor: paleta.accent, borderColor: paleta.accent } : { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(255,255,255,0.3)' }
                ]}
                onPress={() => setEspacioSeleccionado(e.id)}
              >
                <Text style={{ color: 'white', fontWeight: espacioSeleccionado === e.id ? 'bold' : 'normal' }}>
                  {e.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* CAPA CENTRAL: Marco delimitador */}
      <View style={estilos.overlay}>
        <View style={estilos.marcoEscaner} />
        <Text style={estilos.textoOverlay}>Apuntá al código QR de la reserva</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: 'black' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  botonPermiso: { paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
  textoBotonPermiso: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  capaSuperior: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  cabeceraEscaner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  botonCerrar: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  tituloCapa: { color: 'white', fontSize: 18, fontWeight: 'bold', textShadowColor: 'black', textShadowRadius: 4 },
  
  selectorContainer: { marginTop: 15, paddingLeft: 20 },
  labelSelector: { color: 'white', fontSize: 13, marginBottom: 8, fontWeight: '600', textShadowColor: 'black', textShadowRadius: 4 },
  scrollEspacios: { gap: 10, paddingRight: 40 },
  chipEspacio: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  marcoEscaner: { width: 250, height: 250, borderWidth: 3, borderColor: 'white', backgroundColor: 'transparent', marginBottom: 20, borderRadius: 12, borderStyle: 'dashed' },
  textoOverlay: { color: 'white', fontSize: 14, fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, overflow: 'hidden' }
});