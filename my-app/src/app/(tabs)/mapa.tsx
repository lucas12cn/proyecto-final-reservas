import { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Linking, FlatList } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { obtenerEspacios } from '../../servicios/reservas';
import { mapaDisponible } from '../../servicios/mapa';
import { distanciaEnKm, idDelMasCercano, textoDistancia, Punto } from '../../servicios/geo';
import { useTema } from '../../hooks/use-theme';

type Complejo = { id: string; nombre: string; latitud: number; longitud: number; canchas: string[] };

// Vista inicial si todavía no hay complejos (centro de Villaguay)
const REGION_VILLAGUAY = {
  latitude: -31.8644,
  longitude: -59.0272,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function MapaScreen() {
  const { paleta, esOscuro } = useTema();
  const mapaRef = useRef<MapView>(null);

  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [seleccionado, setSeleccionado] = useState<Complejo | null>(null);
  const [ubicacion, setUbicacion] = useState<Punto | null>(null);
  const [permisoUbicacion, setPermisoUbicacion] = useState(false);
  const [mapaListo, setMapaListo] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
    pedirUbicacion();
  }, []);

  // Agrupa los espacios por complejo (se usan las coordenadas del primer espacio de cada uno)
  const cargarDatos = async () => {
    try {
      const listaEspacios = await obtenerEspacios();
      const agrupados: Record<string, Complejo> = {};

      listaEspacios.forEach((espacio: any) => {
        if (espacio.coordenadas && espacio.coordenadas.latitud && espacio.coordenadas.longitud) {
          const nombreComplejo = espacio.complejo || 'Complejo Deportivo';

          if (!agrupados[nombreComplejo]) {
            agrupados[nombreComplejo] = {
              id: nombreComplejo,
              nombre: nombreComplejo,
              latitud: espacio.coordenadas.latitud,
              longitud: espacio.coordenadas.longitud,
              canchas: [],
            };
          }
          agrupados[nombreComplejo].canchas.push(espacio.nombre);
        }
      });

      setComplejos(Object.values(agrupados));
    } catch (error) {
      console.error('Error al cargar complejos:', error);
    } finally {
      setCargando(false);
    }
  };

  // La ubicación es opcional: si se niega el permiso, el mapa funciona igual (PRD)
  const pedirUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      setPermisoUbicacion(true);
      const posicion = await Location.getCurrentPositionAsync({});
      setUbicacion({ latitude: posicion.coords.latitude, longitude: posicion.coords.longitude });
    } catch (error) {
      console.warn('No se pudo obtener la ubicación:', error);
    }
  };

  // Encuadra todos los complejos apenas el mapa y los datos están listos
  useEffect(() => {
    if (!mapaListo || complejos.length === 0) return;

    if (complejos.length === 1) {
      mapaRef.current?.animateToRegion(
        { latitude: complejos[0].latitud, longitude: complejos[0].longitud, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        0
      );
      return;
    }
    mapaRef.current?.fitToCoordinates(
      complejos.map((c) => ({ latitude: c.latitud, longitude: c.longitud })),
      { edgePadding: { top: 140, right: 60, bottom: 220, left: 60 }, animated: false }
    );
  }, [mapaListo, complejos]);

  // El complejo más cercano al usuario (PRD: "saber qué complejo tiene más cerca")
  const masCercanoId = useMemo(
    () => idDelMasCercano(ubicacion, complejos),
    [ubicacion, complejos]
  );

  const comoLlegar = (c: Complejo) => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${c.latitud},${c.longitud}`);
  };

  // Un APK de Android compilado sin la clave de Google Maps no puede dibujar el mapa: se muestran los
  // mismos complejos como lista, con la distancia y "Cómo llegar" (que abre Google Maps).
  if (!mapaDisponible()) {
    const ordenados = [...complejos].sort((a, b) =>
      ubicacion
        ? distanciaEnKm(ubicacion, { latitude: a.latitud, longitude: a.longitud }) -
          distanciaEnKm(ubicacion, { latitude: b.latitud, longitude: b.longitud })
        : 0
    );
    return (
      <View style={[styles.container, { backgroundColor: paleta.background }]}>
        <View style={[styles.cabeceraFlotante, { backgroundColor: paleta.surface }]}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
            <Ionicons name="arrow-back" size={24} color={paleta.text} />
          </TouchableOpacity>
          <Text style={[styles.tituloCabecera, { color: paleta.text }]}>Complejos</Text>
          <View style={{ width: 34 }} />
        </View>

        {cargando ? (
          <View style={styles.centrado}><ActivityIndicator size="large" color={paleta.accent} /></View>
        ) : (
          <FlatList
            data={ordenados}
            keyExtractor={(c) => c.id}
            contentContainerStyle={{ paddingTop: 120, paddingHorizontal: 16, paddingBottom: 24 }}
            ListHeaderComponent={
              <Text style={{ color: paleta.muted, marginBottom: 14, fontSize: 13 }}>
                Esta versión de la app no trae el mapa (falta la clave de Google Maps). Podés ver los complejos y cómo llegar.
              </Text>
            }
            ListEmptyComponent={
              <Text style={{ color: paleta.muted, textAlign: 'center', marginTop: 40 }}>
                No hay complejos para mostrar. Probá de nuevo con conexión.
              </Text>
            }
            renderItem={({ item: c }) => (
              <View style={[styles.tarjetaLista, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
                <Text style={{ color: paleta.text, fontSize: 17, fontWeight: 'bold' }}>{c.nombre}</Text>
                <Text style={{ color: paleta.muted, marginTop: 2 }}>
                  {c.canchas.length} {c.canchas.length === 1 ? 'cancha' : 'canchas'}
                  {ubicacion ? ` · a ${textoDistancia(distanciaEnKm(ubicacion, { latitude: c.latitud, longitude: c.longitud }))}` : ''}
                  {c.id === masCercanoId ? ' · El más cercano' : ''}
                </Text>
                <Text style={{ color: paleta.muted, fontSize: 12, marginTop: 6 }} numberOfLines={3}>{c.canchas.join(' · ')}</Text>
                <TouchableOpacity style={[styles.botonLlegar, { backgroundColor: paleta.accent }]} onPress={() => comoLlegar(c)}>
                  <Ionicons name="navigate" size={18} color="#fff" />
                  <Text style={styles.textoBotonLlegar}>Cómo llegar</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Cabecera flotante */}
      <View style={[styles.cabeceraFlotante, { backgroundColor: paleta.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color={paleta.text} />
        </TouchableOpacity>
        <Text style={[styles.tituloCabecera, { color: paleta.text }]}>Mapa de Complejos</Text>
        <View style={{ width: 34 }} />
      </View>

      <MapView
        ref={mapaRef}
        style={StyleSheet.absoluteFill}
        initialRegion={REGION_VILLAGUAY}
        onMapReady={() => setMapaListo(true)}
        showsUserLocation={permisoUbicacion}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        userInterfaceStyle={esOscuro ? 'dark' : 'light'}
      >
        {complejos.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.latitud, longitude: c.longitud }}
            pinColor={c.id === masCercanoId ? '#16a34a' : undefined}
            onPress={() => setSeleccionado(c)}
          />
        ))}
      </MapView>

      {/* Tarjeta del complejo elegido */}
      {seleccionado && (
        <View style={[styles.tarjeta, { backgroundColor: paleta.surface, borderColor: paleta.border }]}>
          <View style={styles.filaTitulo}>
            <Text style={[styles.tarjetaTitulo, { color: paleta.text }]} numberOfLines={2}>
              {seleccionado.nombre}
            </Text>
            <TouchableOpacity onPress={() => setSeleccionado(null)} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={paleta.muted} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: paleta.muted, marginTop: 2 }}>
            {seleccionado.canchas.length} {seleccionado.canchas.length === 1 ? 'cancha' : 'canchas'}
            {ubicacion
              ? ` · a ${textoDistancia(distanciaEnKm(ubicacion, { latitude: seleccionado.latitud, longitude: seleccionado.longitud }))}`
              : ''}
            {seleccionado.id === masCercanoId ? ' · El más cercano' : ''}
          </Text>
          <Text style={{ color: paleta.muted, fontSize: 12, marginTop: 6 }} numberOfLines={3}>
            {seleccionado.canchas.join(' · ')}
          </Text>

          <TouchableOpacity
            style={[styles.botonLlegar, { backgroundColor: paleta.accent }]}
            onPress={() => comoLlegar(seleccionado)}
          >
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.textoBotonLlegar}>Cómo llegar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!cargando && complejos.length === 0 && (
        <View style={[styles.aviso, { backgroundColor: paleta.surface }]}>
          <Text style={{ color: paleta.muted, textAlign: 'center' }}>
            No hay complejos para mostrar. Probá de nuevo con conexión.
          </Text>
        </View>
      )}

      {cargando && (
        <View style={[StyleSheet.absoluteFill, styles.centrado, { backgroundColor: paleta.background }]}>
          <ActivityIndicator size="large" color={paleta.accent} />
          <Text style={{ marginTop: 15, color: paleta.muted }}>Cargando mapa...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  cabeceraFlotante: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tituloCabecera: { fontSize: 18, fontWeight: 'bold' },

  tarjeta: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  tarjetaTitulo: { flex: 1, fontSize: 18, fontWeight: 'bold' },
  botonLlegar: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  textoBotonLlegar: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  tarjetaLista: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 12 },
  aviso: { position: 'absolute', left: 20, right: 20, bottom: 40, padding: 14, borderRadius: 12, zIndex: 10 },
});
