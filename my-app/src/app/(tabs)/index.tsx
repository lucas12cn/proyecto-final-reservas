import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import * as Network from 'expo-network';
import * as SQLite from 'expo-sqlite';
import { useTema } from '../../hooks/use-theme';
import { useAuth } from '../../contexto/AuthContext';
import { obtenerMisReservas, cancelarReserva, obtenerEspacios } from '../../servicios/reservas';

export default function MisReservasScreen() {
  const { paleta } = useTema();
  const { usuario } = useAuth();

  const [filtro, setFiltro] = useState<'proximas' | 'pasadas'>('proximas');
  const [reservas, setReservas] = useState<any[]>([]);
  const [espacios, setEspacios] = useState<Record<string, any>>({});
  const [cargando, setCargando] = useState(true);
  const [modoOffline, setModoOffline] = useState(false);

  const cargarMisReservas = async () => {
    if (!usuario) {
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      const estadoRed = await Network.getNetworkStateAsync();

      if (estadoRed.isConnected && estadoRed.isInternetReachable) {
        // 1. ONLINE: LLAMADA A TU API REAL EN NESTJS
        setModoOffline(false);
        const [listaReservas, listaEspacios] = await Promise.all([
          obtenerMisReservas(filtro),
          obtenerEspacios()
        ]);

        const mapaEspacios: Record<string, any> = {};
        listaEspacios.forEach((e: any) => mapaEspacios[e.id] = e);
        
        setEspacios(mapaEspacios);
        setReservas(listaReservas);

        // Guardar en caché con SQLite (Métodos sincrónicos para evitar crasheos en Android)
        try {
          const db = SQLite.openDatabaseSync('mis_reservas_final.db');
          db.execSync(`
            CREATE TABLE IF NOT EXISTS cache_reservas (
              filtro TEXT PRIMARY KEY, 
              reservas_json TEXT, 
              espacios_json TEXT
            );
          `);
          db.runSync(
            'INSERT OR REPLACE INTO cache_reservas (filtro, reservas_json, espacios_json) VALUES (?, ?, ?)',
            [filtro, JSON.stringify(listaReservas), JSON.stringify(mapaEspacios)]
          );
        } catch (sqliteError) {
          console.log("Aviso: No se guardó caché local", sqliteError);
        }
      } else {
        // 2. OFFLINE: Recuperar del caché local SQLite
        setModoOffline(true);
        try {
          const db = SQLite.openDatabaseSync('mis_reservas_final.db');
          // Por si se abre por primera vez offline, creamos la tabla antes de consultar
          db.execSync(`
            CREATE TABLE IF NOT EXISTS cache_reservas (
              filtro TEXT PRIMARY KEY, 
              reservas_json TEXT, 
              espacios_json TEXT
            );
          `);
          
          const fila = db.getFirstSync<{ reservas_json: string, espacios_json: string }>(
            'SELECT reservas_json, espacios_json FROM cache_reservas WHERE filtro = ?',
            [filtro]
          );

          if (fila) {
            setReservas(JSON.parse(fila.reservas_json));
            setEspacios(JSON.parse(fila.espacios_json));
          } else {
            setReservas([]);
            setEspacios({});
          }
        } catch (sqliteError) {
          setReservas([]);
          setEspacios({});
        }
      }
    } catch (error) {
      console.error('Error cargando reservas de la API:', error);
    } finally {
      setCargando(false); 
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarMisReservas(); 
    }, [filtro, usuario])
  );

  const manejarCancelacion = (id: string) => {
    Alert.alert(
      'Cancelar Reserva',
      '¿Estás seguro de que querés cancelar este turno?',
      [
        { text: 'No, mantener', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelarReserva(id);
              Alert.alert('Éxito', 'La reserva fue cancelada.');
              cargarMisReservas(); 
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo cancelar el turno.');
            }
          }
        }
      ]
    );
  };

  const dosDigitos = (n: number) => String(n).padStart(2, '0');

  // Plazo para cancelar sin aviso, calculado desde `cancelableHasta` (lo entrega la API).
  const plazoDeCancelacion = (cancelableHasta?: string) => {
    const limite = cancelableHasta ? new Date(cancelableHasta) : null;
    if (!limite || Number.isNaN(limite.getTime())) return { vencido: false, texto: '' };

    const ahora = new Date();
    if (limite.getTime() <= ahora.getTime()) {
      return { vencido: true, texto: 'Ya pasó el plazo para cancelar.\nAvisale al encargado.' };
    }
    const hora = `${dosDigitos(limite.getHours())}:${dosDigitos(limite.getMinutes())}`;
    const dia = limite.toDateString() === ahora.toDateString()
      ? 'de hoy'
      : `del ${dosDigitos(limite.getDate())}/${dosDigitos(limite.getMonth() + 1)}`;
    return { vencido: false, texto: `Se puede cancelar sin aviso\nhasta las ${hora} ${dia}` };
  };

  const formatearTurno = (turnoId: string) => {
    if (!turnoId) return { fecha: '', hora: '' };
    const partes = turnoId.split('-');
    if (partes.length < 5) return { fecha: '', hora: '' };
    const horaStr = partes[4] + ':00';
    const f = partes[3];
    const fechaStr = `${f.substring(0,4)}-${f.substring(4,6)}-${f.substring(6,8)}`;
    return { fecha: fechaStr, hora: horaStr };
  };

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.selectorFiltro, { backgroundColor: paleta.background }]}>
        <TouchableOpacity 
          style={[estilos.botonFiltro, filtro === 'proximas' && { borderBottomColor: paleta.accent, borderBottomWidth: 2 }]}
          onPress={() => setFiltro('proximas')}
        >
          <Text style={[estilos.textoFiltro, { color: filtro === 'proximas' ? paleta.accent : paleta.muted }]}>Próximas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[estilos.botonFiltro, filtro === 'pasadas' && { borderBottomColor: paleta.accent, borderBottomWidth: 2 }]}
          onPress={() => setFiltro('pasadas')}
        >
          <Text style={[estilos.textoFiltro, { color: filtro === 'pasadas' ? paleta.accent : paleta.muted }]}>Historial</Text>
        </TouchableOpacity>
      </View>

      {modoOffline && (
        <View style={estilos.cartelOffline}>
          <Text style={estilos.textoOffline}>⚠️ Sin conexión. Mostrando reservas guardadas.</Text>
        </View>
      )}

      {cargando && reservas.length === 0 ? (
        <View style={estilos.centrado}>
          <ActivityIndicator size="large" color={paleta.accent} />
          <Text style={{ marginTop: 10, color: paleta.muted }}>Buscando tus reservas...</Text>
        </View>
      ) : (
        <FlatList
          data={reservas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={estilos.lista}
          ListEmptyComponent={
            <Text style={estilos.vacio}>No tenés reservas {filtro === 'proximas' ? 'activas' : 'en tu historial'}.</Text>
          }
          renderItem={({ item }) => {
            const espacioInfo = espacios[item.espacioId];
            const { fecha, hora } = formatearTurno(item.turnoId);
            
            let horaFin = '';
            if (hora) {
              const horaInicio = parseInt(hora.split(':')[0]);
              horaFin = `${horaInicio + 1}:00`;
            }

            const nombreCancha = espacioInfo ? espacioInfo.nombre : 'Cargando...';
            const complejo = espacioInfo ? espacioInfo.complejo : 'Polideportivo';
            const precio = espacioInfo ? `$ ${espacioInfo.precioPorHora}` : '---';
            const fechaTexto = fecha ? `${fecha} de ${hora} a ${horaFin} hs` : 'Fecha a confirmar';
            const estado = item.estado ? item.estado.toUpperCase() : 'CONFIRMADA';

            return (
              <View style={estilos.tarjetaWireframe}>
                <View style={estilos.cabeceraWireframe}>
                  <Text style={estilos.textoEstadoWireframe}>
                    &lt; Mi reserva - {estado} &gt;
                  </Text>
                </View>

                <View style={estilos.infoWireframe}>
                  <Text style={estilos.tituloCanchaWireframe}>{nombreCancha}</Text>
                  <Text style={estilos.textoDetalleWireframe}>{fechaTexto}</Text>
                  <Text style={estilos.textoDetalleWireframe}>{complejo}</Text>
                  <Text style={estilos.textoDetalleWireframe}>{precio} - se paga en el lugar</Text>
                </View>

                <View style={estilos.bloqueQRWireframe}>
                  {estado === 'CANCELADA' ? (
                    <Text style={{ color: '#ef4444', padding: 20 }}>Reserva cancelada</Text>
                  ) : (
                    <View style={estilos.cajaDecorativaQR}>
                      <QRCode 
                        value={item.codigoQr || item.id} 
                        size={150} 
                        backgroundColor="transparent" 
                      />
                    </View>
                  )}
                  <Text style={estilos.textoAvisoQR}>[ codigo QR de ingreso ]</Text>
                  <Text style={[estilos.textoAvisoQR, { marginTop: 15 }]}>Mostraselo al encargado</Text>
                </View>

                <View style={estilos.accionesWireframe}>
                  <TouchableOpacity 
                    style={estilos.botonWireframe}
                    onPress={() => {
                      const query = encodeURIComponent(`${complejo}, Villaguay`);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                    }}
                  >
                    <Text style={estilos.textoBotonWireframe}>[ Como llegar ]</Text>
                  </TouchableOpacity>

                  {estado !== 'CANCELADA' && filtro === 'proximas' && !modoOffline && (() => {
                    const plazo = plazoDeCancelacion(item.cancelableHasta);
                    return (
                      <View style={estilos.contenedorCancelarWireframe}>
                        {!plazo.vencido && (
                          <TouchableOpacity
                            style={estilos.botonWireframe}
                            onPress={() => manejarCancelacion(item.id)}
                          >
                            <Text style={estilos.textoBotonWireframe}>[ Cancelar reserva ]</Text>
                          </TouchableOpacity>
                        )}
                        {!!plazo.texto && (
                          <Text style={estilos.avisoCancelacion}>{plazo.texto}</Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#f8fafc' },
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectorFiltro: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5 },
  botonFiltro: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  textoFiltro: { fontSize: 16, fontWeight: 'bold' },
  cartelOffline: { backgroundColor: '#f59e0b', padding: 10, alignItems: 'center' },
  textoOffline: { color: '#fff', fontWeight: 'bold' },
  lista: { padding: 15, paddingBottom: 30 },
  vacio: { textAlign: 'center', marginTop: 50, color: '#64748b', fontSize: 16 },
  tarjetaWireframe: { 
    backgroundColor: '#ffffff',
    borderWidth: 1.5, 
    borderColor: '#94a3b8',
    marginBottom: 20, 
    borderStyle: 'dashed',
    borderRadius: 4
  },
  cabeceraWireframe: { 
    padding: 12, 
    borderBottomWidth: 1.5, 
    borderStyle: 'dashed', 
    borderBottomColor: '#94a3b8' 
  },
  textoEstadoWireframe: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#334155' 
  },
  infoWireframe: { 
    padding: 15, 
    borderBottomWidth: 1.5, 
    borderStyle: 'dashed', 
    borderBottomColor: '#94a3b8' 
  },
  tituloCanchaWireframe: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#0f172a',
    marginBottom: 6 
  },
  textoDetalleWireframe: { 
    fontSize: 14, 
    color: '#334155',
    marginBottom: 4,
    paddingLeft: 8 
  },
  bloqueQRWireframe: { 
    padding: 25, 
    alignItems: 'center', 
    borderBottomWidth: 1.5, 
    borderStyle: 'dashed', 
    borderBottomColor: '#94a3b8' 
  },
  cajaDecorativaQR: { 
    padding: 10, 
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    marginBottom: 15 
  },
  textoAvisoQR: { 
    fontSize: 14,
    color: '#475569',
    fontWeight: '500'
  },
  accionesWireframe: { 
    paddingTop: 10,
    paddingBottom: 15
  },
  botonWireframe: { 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  textoBotonWireframe: { 
    fontSize: 15, 
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 0.5
  },
  contenedorCancelarWireframe: { 
    alignItems: 'center', 
    marginTop: 5 
  },
  avisoCancelacion: { 
    fontSize: 12, 
    textAlign: 'center',
    color: '#64748b',
    marginTop: -2
  }
});