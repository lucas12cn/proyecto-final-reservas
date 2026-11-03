import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import { obtenerEspacios, cambiarPrecioApi } from '../../servicios/reservas';
import { mensajeDe } from '../../servicios/errores';
import { Espacio } from '../../tipos';

const PRECIO_MAXIMO = 100_000_000; // el mismo tope que valida la API

// 9500 → "$9.500"
const pesos = (n: number) => '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function PreciosScreen() {
  const { paleta } = useTema();
  const { usuario } = useAuth();
  // Cambiar precios es del administrador (D6); la API además responde 403 al resto.
  const esAdmin = usuario?.rol === 'administrador';

  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [editando, setEditando] = useState<Espacio | null>(null);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async (modo: 'completo' | 'refresco' = 'completo') => {
    if (modo === 'completo') setCargando(true);
    try {
      const lista = await obtenerEspacios();
      setEspacios([...lista].sort((a, b) => a.complejo.localeCompare(b.complejo) || a.nombre.localeCompare(b.nombre)));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  useFocusEffect(useCallback(() => { if (esAdmin) cargar(); }, [esAdmin]));

  const abrir = (espacio: Espacio) => {
    setEditando(espacio);
    setTexto(String(espacio.precioPorHora));
  };

  const guardar = async () => {
    if (!editando) return;
    const precio = Number(texto);
    if (!/^\d+$/.test(texto) || precio < 1 || precio > PRECIO_MAXIMO) {
      return Alert.alert('Precio no válido', 'Escribí un número entero de pesos, mayor que cero.');
    }

    setGuardando(true);
    try {
      const actualizado = await cambiarPrecioApi(editando.id, precio);
      setEspacios((previos) => previos.map((e) => (e.id === actualizado.id ? { ...e, precioPorHora: actualizado.precioPorHora } : e)));
      setEditando(null);
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeDe(e, 'Probá de nuevo.'));
    } finally {
      setGuardando(false);
    }
  };

  if (!esAdmin) {
    return (
      <View style={[estilos.centrado, { backgroundColor: paleta.background, padding: 24 }]}>
        <Ionicons name="lock-closed-outline" size={60} color={paleta.muted} style={{ marginBottom: 20 }} />
        <Text style={{ color: paleta.text, textAlign: 'center', fontSize: 16 }}>Los precios los cambia sólo el administrador.</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.background }]}>
      {cargando ? (
        <View style={estilos.centrado}><ActivityIndicator size="large" color={paleta.accent} /></View>
      ) : (
        <FlatList
          data={espacios}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ padding: 16 }}
          refreshing={refrescando}
          onRefresh={() => { setRefrescando(true); cargar('refresco'); }}
          ListHeaderComponent={<Text style={{ color: paleta.muted, marginBottom: 12 }}>Precio por hora de cada espacio. Tocá uno para cambiarlo.</Text>}
          ListEmptyComponent={<Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 40 }}>No hay espacios para mostrar.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[estilos.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}
              onPress={() => abrir(item)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: paleta.text, fontWeight: 'bold', fontSize: 16 }}>{item.nombre}</Text>
                <Text style={{ color: paleta.muted, marginTop: 2 }}>{item.complejo}</Text>
              </View>
              <Text style={{ color: paleta.text, fontWeight: 'bold', fontSize: 16 }}>{pesos(item.precioPorHora)}/h</Text>
              <Ionicons name="create-outline" size={20} color={paleta.muted} style={{ marginLeft: 10 }} />
            </TouchableOpacity>
          )}
        />
      )}

      <Modal visible={!!editando} transparent animationType="fade" onRequestClose={() => setEditando(null)}>
        <KeyboardAvoidingView style={estilos.fondoModal} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[estilos.cuadro, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
            <Text style={{ color: paleta.text, fontSize: 18, fontWeight: 'bold' }}>{editando?.nombre}</Text>
            <Text style={{ color: paleta.muted, marginTop: 4 }}>Precio por hora, en pesos</Text>
            <TextInput
              value={texto}
              onChangeText={(t) => setTexto(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              autoFocus
              maxLength={9}
              style={[estilos.entrada, { color: paleta.text, borderColor: paleta.border, backgroundColor: paleta.background }]}
            />
            <View style={estilos.botones}>
              <TouchableOpacity onPress={() => setEditando(null)} style={[estilos.boton, { borderColor: paleta.border, borderWidth: 1 }]}>
                <Text style={{ color: paleta.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={guardar} disabled={guardando} style={[estilos.boton, { backgroundColor: paleta.accent, opacity: guardando ? 0.6 : 1 }]}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tarjeta: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  fondoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  cuadro: { borderWidth: 1, borderRadius: 16, padding: 20 },
  entrada: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 20, marginTop: 14, textAlign: 'center' },
  botones: { flexDirection: 'row', gap: 12, marginTop: 18 },
  boton: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
});
