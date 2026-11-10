import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as SecureStore from 'expo-secure-store';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import { SelectorServidor } from '../../componentes/SelectorServidor';
import { actualizarPerfilApi } from '../../servicios/auth';
import { Usuario } from '../../tipos';

export default function PerfilScreen() {
  const { paleta, modoManual, cambiarTema } = useTema();
  const { usuario, logout } = useAuth();
  
  const [usuarioVisual, setUsuarioVisual] = useState<Usuario | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [nombreForm, setNombreForm] = useState('');
  const [telefonoForm, setTelefonoForm] = useState('');
  const [guardando, setGuardando] = useState(false);

  const opcionesTema = [
    { valor: 'sistema', icono: 'phone-portrait-outline', label: 'Sistema' },
    { valor: 'claro', icono: 'sunny-outline', label: 'Claro' },
    { valor: 'oscuro', icono: 'moon-outline', label: 'Oscuro' },
  ];

  useEffect(() => {
    setUsuarioVisual(usuario);
  }, [usuario]);

  const abrirEdicion = () => {
    if (usuarioVisual) {
      setNombreForm(usuarioVisual.nombre);
      setTelefonoForm(usuarioVisual.telefono);
      setModalVisible(true);
    }
  };

  const guardarCambios = async () => {
    if (!nombreForm.trim() || !telefonoForm.trim()) {
      Alert.alert('Error', 'El nombre y el teléfono no pueden estar vacíos.');
      return;
    }

    setGuardando(true);
    try {
      const usuarioActualizado = await actualizarPerfilApi({
        nombre: nombreForm,
        telefono: telefonoForm
      });

      setUsuarioVisual(usuarioActualizado);
      await SecureStore.setItemAsync('usuarioReserva', JSON.stringify(usuarioActualizado));
      
      setModalVisible(false);
      Alert.alert('Éxito', 'Tu perfil fue actualizado correctamente.');
    } catch (error: any) {
      Alert.alert('Error al guardar', error.message);
    } finally {
      setGuardando(false);
    }
  };

  const manejarCierreSesion = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que querés salir de tu cuenta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sí, salir', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[estilos.pantalla, { backgroundColor: paleta.background }]} edges={['top']}>
      <View style={estilos.cabecera}>
        <Text style={[estilos.titulo, { color: paleta.text }]}>Mi Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={estilos.contenedor} showsVerticalScrollIndicator={false}>
        <Ionicons name="person-circle" size={100} color={paleta.muted} style={estilos.avatar} />
        
        {usuarioVisual ? (
          <>
            <Text style={[estilos.nombre, { color: paleta.text }]}>{usuarioVisual.nombre}</Text>
            <Text style={[estilos.email, { color: paleta.muted }]}>{usuarioVisual.email}</Text>
            
            {/* DATOS DE CONTACTO */}
            <View style={[estilos.cajaDatos, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
              <View style={[estilos.filaDato, { borderBottomColor: paleta.border }]}>
                <Ionicons name="call-outline" size={20} color={paleta.muted} style={estilos.iconoDato} />
                <Text style={[estilos.textoDato, { color: paleta.text }]}>{usuarioVisual.telefono || 'Sin teléfono'}</Text>
              </View>
              <View style={estilos.filaDato}>
                <Ionicons name="shield-checkmark-outline" size={20} color={paleta.muted} style={estilos.iconoDato} />
                <Text style={[estilos.textoDato, { color: paleta.text, textTransform: 'capitalize' }]}>{usuarioVisual.rol}</Text>
              </View>
            </View>

            {/* ESTADÍSTICAS RECIÉN INTEGRADAS */}
            <View style={estilos.contenedorEstadisticas}>
              <View style={[estilos.cajaEstadistica, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <Text style={[estilos.numeroEstadistica, { color: paleta.text }]}>{usuarioVisual.ausencias || 0}</Text>
                <Text style={{ color: paleta.muted, fontSize: 13, textAlign: 'center' }}>Ausencias</Text>
              </View>
              <View style={[estilos.cajaEstadistica, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <Text style={[estilos.numeroEstadistica, { color: paleta.text }]}>{usuarioVisual.cancelacionesTardias || 0}</Text>
                <Text style={{ color: paleta.muted, fontSize: 13, textAlign: 'center' }}>Cancel. Tardías</Text>
              </View>
            </View>

            {/* ACCIONES DEL PERFIL */}
            <View style={estilos.filaBotonesAccion}>
              <TouchableOpacity style={[estilos.botonAccionMitad, { borderColor: paleta.accent, borderWidth: 1 }]} onPress={abrirEdicion}>
                <Ionicons name="pencil" size={18} color={paleta.accent} style={{ marginRight: 8 }} />
                <Text style={{ color: paleta.accent, fontWeight: 'bold' }}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[estilos.botonAccionMitad, { backgroundColor: '#ef4444' }]} onPress={manejarCierreSesion}>
                <Ionicons name="log-out-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Salir</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={[estilos.nombre, { color: paleta.text }]}>Invitado</Text>
            <Text style={[estilos.email, { color: paleta.muted, textAlign: 'center', marginTop: 10, paddingHorizontal: 20 }]}>
              Iniciá sesión para poder reservar canchas y ver tu historial.
            </Text>

            <TouchableOpacity 
              style={[estilos.botonLogin, { backgroundColor: paleta.accent, marginTop: 30 }]} 
              onPress={() => router.push('/login')}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>Iniciar Sesión</Text>
            </TouchableOpacity>
          </>
        )}

        {/* SELECTOR DE TEMA */}
        <View style={[estilos.contenedorTema, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
          <Text style={[estilos.tituloTema, { color: paleta.text }]}>Apariencia</Text>
          <View style={estilos.filaBotonesTema}>
            {opcionesTema.map((opcion) => {
              const activo = modoManual === opcion.valor;
              return (
                <TouchableOpacity
                  key={opcion.valor}
                  onPress={() => cambiarTema(opcion.valor as any)}
                  style={[
                    estilos.botonTema,
                    { backgroundColor: activo ? paleta.accent : 'transparent' }
                  ]}
                >
                  <Ionicons name={opcion.icono as any} size={20} color={activo ? '#fff' : paleta.muted} />
                  <Text style={[estilos.textoBotonTema, { color: activo ? '#fff' : paleta.muted }]}>
                    {opcion.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SERVIDOR DE LA API (para el APK de preview con la API local) */}
        <View style={{ marginTop: 16 }}>
          <SelectorServidor />
        </View>

      </ScrollView>

      {/* Modal para Editar Perfil */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={estilos.modalFondo}>
          <View style={[estilos.modalContenedor, { backgroundColor: paleta.background }]}>
            <Text style={[estilos.modalTitulo, { color: paleta.text }]}>Editar Perfil</Text>
            
            <Text style={[estilos.labelFormulario, { color: paleta.muted }]}>Nombre completo</Text>
            <TextInput 
              style={[estilos.input, { color: paleta.text, borderColor: paleta.border, backgroundColor: paleta.surface }]}
              value={nombreForm}
              onChangeText={setNombreForm}
              placeholderTextColor={paleta.muted}
            />

            <Text style={[estilos.labelFormulario, { color: paleta.muted }]}>Teléfono</Text>
            <TextInput 
              style={[estilos.input, { color: paleta.text, borderColor: paleta.border, backgroundColor: paleta.surface }]}
              value={telefonoForm}
              onChangeText={setTelefonoForm}
              keyboardType="phone-pad"
              placeholderTextColor={paleta.muted}
            />

            <View style={estilos.modalFilaBotones}>
              <TouchableOpacity 
                style={[estilos.botonCancelar, { backgroundColor: paleta.surface, borderColor: paleta.border }]} 
                onPress={() => setModalVisible(false)}
                disabled={guardando}
              >
                <Text style={{ color: paleta.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[estilos.botonGuardar, { backgroundColor: paleta.accent }]} 
                onPress={guardarCambios}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  cabecera: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'transparent' },
  titulo: { fontSize: 22, fontWeight: 'bold' },
  contenedor: { flexGrow: 1, alignItems: 'center', paddingTop: 10, paddingHorizontal: 20, paddingBottom: 40 },
  avatar: { marginBottom: 15 },
  nombre: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },
  email: { fontSize: 16, marginBottom: 20, textAlign: 'center' },
  
  cajaDatos: { width: '100%', borderRadius: 12, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  filaDato: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  iconoDato: { marginRight: 15 },
  textoDato: { fontSize: 16 },

  contenedorEstadisticas: { flexDirection: 'row', gap: 15, marginBottom: 30, width: '100%' },
  cajaEstadistica: { flex: 1, alignItems: 'center', padding: 20, borderRadius: 12, borderWidth: 1 },
  numeroEstadistica: { fontSize: 28, fontWeight: 'bold', marginBottom: 5 },
  
  filaBotonesAccion: { flexDirection: 'row', width: '100%', gap: 15 },
  botonAccionMitad: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  botonLogin: { width: '100%', padding: 16, borderRadius: 12, alignItems: 'center' },

  contenedorTema: { width: '100%', padding: 18, borderRadius: 12, borderWidth: 1, marginTop: 30 },
  tituloTema: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  filaBotonesTema: { flexDirection: 'row', backgroundColor: '#00000010', borderRadius: 8, padding: 4 },
  botonTema: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 6, gap: 6 },
  textoBotonTema: { fontWeight: 'bold', fontSize: 13 },

  modalFondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContenedor: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 25, elevation: 10 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  labelFormulario: { fontSize: 14, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 20 },
  modalFilaBotones: { flexDirection: 'row', gap: 15, marginTop: 10 },
  botonCancelar: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  botonGuardar: { flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' }
});