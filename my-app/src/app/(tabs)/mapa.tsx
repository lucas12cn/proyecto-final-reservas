import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import Ionicons from '@react-native-vector-icons/ionicons';
import { obtenerEspacios } from '../../servicios/reservas'; 
import { useTema } from '../../hooks/use-theme';

type Complejo = { id: string; nombre: string; lat: number; lng: number; canchas: string[] };

// Coordenadas de Villaguay por defecto
const CENTRO = { lat: -31.8644, lng: -59.0272 };

function armarHtml(complejos: Complejo[], usuario: { latitude: number; longitude: number } | null) {
  const datos = JSON.stringify({ centro: CENTRO, complejos, usuario }).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background-color: #f8fafc; }
    .leaflet-popup-content-wrapper { border-radius: 12px; }
    .leaflet-popup-content { font-family: sans-serif; text-align: center; font-size: 14px; margin: 10px; }
    .titulo { font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #0f172a; }
    .canchas { font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var datos = ${datos};
    var map = L.map('map', { zoomControl: false }).setView([datos.centro.lat, datos.centro.lng], 14);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    var puntos = [];
    datos.complejos.forEach(function (c) {
      var contenidoPopup = '<div class="titulo">' + c.nombre + '</div>' + 
                           '<div class="canchas">' + c.canchas.length + ' canchas disponibles</div>';
      
      L.marker([c.lat, c.lng]).addTo(map).bindPopup(contenidoPopup);
      puntos.push([c.lat, c.lng]);
    });

    if (puntos.length > 0) {
      map.fitBounds(L.latLngBounds(puntos).pad(0.2), { maxZoom: 15 });
    }

    if (datos.usuario) {
      L.circleMarker([datos.usuario.latitude, datos.usuario.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 1
      }).addTo(map);
    }
  </script>
</body>
</html>`;
}

export default function MapaScreen() {
  const { paleta } = useTema();
  const [ubicacionUsuario, setUbicacionUsuario] = useState<Location.LocationObjectCoords | null>(null);
  const [complejos, setComplejos] = useState<Complejo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
    pedirUbicacion();
  }, []);

  const cargarDatos = async () => {
    try {
      const listaEspacios = await obtenerEspacios();
      const complejosAgrupados: Record<string, Complejo> = {};
      
      listaEspacios.forEach((espacio: any) => {
        if (espacio.coordenadas && espacio.coordenadas.latitud && espacio.coordenadas.longitud) {
          const nombreComplejo = espacio.complejo || 'Complejo Deportivo';
          
          if (!complejosAgrupados[nombreComplejo]) {
            complejosAgrupados[nombreComplejo] = {
              id: nombreComplejo,
              nombre: nombreComplejo,
              lat: espacio.coordenadas.latitud,
              lng: espacio.coordenadas.longitud,
              canchas: []
            };
          }
          complejosAgrupados[nombreComplejo].canchas.push(espacio.nombre);
        }
      });

      setComplejos(Object.values(complejosAgrupados));
    } catch (error) {
      console.error('Error al cargar complejos:', error);
    } finally {
      setCargando(false);
    }
  };

  const pedirUbicacion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const location = await Location.getCurrentPositionAsync({});
      setUbicacionUsuario(location.coords);
    } catch (error) {
      console.warn('No se pudo obtener la ubicación:', error);
    }
  };

  const html = useMemo(
    () => armarHtml(complejos, ubicacionUsuario),
    [complejos, ubicacionUsuario]
  );

  return (
    <View style={styles.container}>
      {/* Cabecera Flotante */}
      <View style={[styles.cabeceraFlotante, { backgroundColor: paleta.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color={paleta.text} />
        </TouchableOpacity>
        <Text style={[styles.tituloCabecera, { color: paleta.text }]}>Mapa de Complejos</Text>
        <View style={{ width: 34 }} />
      </View>

      {!cargando && (
        <WebView
          originWhitelist={['*']}
          source={{ html }}
          style={StyleSheet.absoluteFill}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
        />
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
  tituloCabecera: { fontSize: 18, fontWeight: 'bold' }
});