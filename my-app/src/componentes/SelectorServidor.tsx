import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, TextInput, ActivityIndicator, Alert, StyleSheet,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../hooks/use-theme';
import { useAuth } from '../contexto/AuthContext';
import { apiUrl, fijarApiUrl, hayUrlPersonalizada, normalizarUrlApi, URL_POR_DEFECTO } from '../servicios/config';
import { probarServidor } from '../servicios/servidor';

interface Colores { texto: string; atenuado: string; borde: string; fondo: string; acento: string }

/**
 * Muestra la dirección de la API y deja cambiarla desde la app, sin recompilar. Está pensado para el
 * APK de preview, que se usa con la API local de la demostración (la IP cambia de una red a otra).
 * `colores` permite usarlo sobre una pantalla de colores fijos (la de entrada es siempre oscura).
 */
export function SelectorServidor({ colores }: { colores?: Partial<Colores> }) {
  const { paleta } = useTema();
  const { usuario, logout } = useAuth();
  const c: Colores = {
    texto: paleta.text, atenuado: paleta.muted, borde: paleta.border, fondo: paleta.surface, acento: paleta.accent,
    ...colores,
  };

  const [actual, setActual] = useState(apiUrl());
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error' | 'probando'; mensaje: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const abrir = () => {
    setTexto(apiUrl());
    setEstado(null);
    setAbierto(true);
  };

  const probar = async () => {
    const url = normalizarUrlApi(texto);
    if (!url) return setEstado({ tipo: 'error', mensaje: 'La dirección no es válida. Ejemplo: http://192.168.0.10:3000' });
    setEstado({ tipo: 'probando', mensaje: 'Probando…' });
    const r = await probarServidor(url);
    setEstado(r.ok ? { tipo: 'ok', mensaje: '✓ La API responde.' } : { tipo: 'error', mensaje: r.mensaje });
  };

  // Un token es de UN servidor: al cambiar de servidor hay que volver a iniciar sesión
  const aplicar = async (nueva: string | null) => {
    const anterior = apiUrl();
    fijarApiUrl(nueva);
    const ahora = apiUrl();
    setActual(ahora);
    setAbierto(false);
    if (ahora !== anterior) {
      if (usuario) await logout();
      Alert.alert('Servidor cambiado', usuario ? 'Volvé a iniciar sesión en el servidor nuevo.' : `Ahora la app usa ${ahora}`);
    }
  };

  const guardar = async () => {
    const url = normalizarUrlApi(texto);
    if (!url) return setEstado({ tipo: 'error', mensaje: 'La dirección no es válida. Ejemplo: http://192.168.0.10:3000' });

    setGuardando(true);
    try {
      const r = await probarServidor(url);
      if (r.ok) return await aplicar(url);
      Alert.alert('No se pudo conectar', `${r.mensaje}\n\n¿Guardar la dirección igual?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar igual', onPress: () => aplicar(url) },
      ]);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <View style={[estilos.fila, { borderColor: c.borde }]}>
        <Ionicons name="server-outline" size={18} color={c.atenuado} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.atenuado, fontSize: 12 }}>Servidor{hayUrlPersonalizada() ? ' (elegido en la app)' : ''}</Text>
          <Text style={{ color: c.texto }} numberOfLines={1}>{actual}</Text>
        </View>
        <TouchableOpacity onPress={abrir} style={{ padding: 6 }}>
          <Text style={{ color: c.acento, fontWeight: 'bold' }}>Cambiar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <KeyboardAvoidingView style={estilos.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[estilos.cuadro, { backgroundColor: c.fondo, borderColor: c.borde }]}>
            <Text style={{ color: c.texto, fontSize: 18, fontWeight: 'bold' }}>Servidor de la API</Text>
            <Text style={{ color: c.atenuado, marginTop: 6, fontSize: 13 }}>
              Escribí la dirección de la computadora donde corre la API: la IP que muestra al arrancar
              ("Desde el teléfono (misma red wifi): http://IP:3000"). El teléfono tiene que estar en esa red.
            </Text>

            <TextInput
              value={texto}
              onChangeText={(t) => { setTexto(t); setEstado(null); }}
              placeholder="http://192.168.0.10:3000"
              placeholderTextColor={c.atenuado}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[estilos.entrada, { color: c.texto, borderColor: c.borde }]}
            />

            {estado && (
              <View style={estilos.estado}>
                {estado.tipo === 'probando' && <ActivityIndicator size="small" color={c.acento} />}
                <Text style={{ color: estado.tipo === 'error' ? '#ef4444' : estado.tipo === 'ok' ? '#16a34a' : c.atenuado, flex: 1 }}>
                  {estado.mensaje}
                </Text>
              </View>
            )}

            <View style={estilos.botones}>
              <TouchableOpacity onPress={probar} style={[estilos.boton, { borderColor: c.borde, borderWidth: 1 }]}>
                <Text style={{ color: c.texto }}>Probar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={guardar}
                disabled={guardando}
                style={[estilos.boton, { backgroundColor: c.acento, opacity: guardando ? 0.6 : 1 }]}
              >
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>}
              </TouchableOpacity>
            </View>

            <View style={estilos.botones}>
              <TouchableOpacity onPress={() => aplicar(null)} style={{ padding: 6 }}>
                <Text style={{ color: c.atenuado, fontSize: 12 }}>Volver a la de fábrica ({URL_POR_DEFECTO})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAbierto(false)} style={{ padding: 6 }}>
                <Text style={{ color: c.atenuado }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  cuadro: { borderWidth: 1, borderRadius: 16, padding: 20 },
  entrada: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginTop: 14 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  botones: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14 },
  boton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
