// Extiende app.json con cosas que dependen del entorno de compilación.
//
//  • GOOGLE_MAPS_API_KEY (variable de entorno): clave de Google Maps para Android, para no escribirla
//    en el repositorio. En Expo Go no hace falta; en un APK sin ella el mapa se reemplaza por la
//    lista de complejos (ver `src/servicios/mapa.ts`). En iPhone el mapa usa Apple Maps y no
//    necesita clave.
//
//  • Tráfico `http://` a la red local: la API de la demostración corre en una notebook, sin https.
//    Android e iOS lo bloquean en los builds de producción, así que se habilita sólo cuando el
//    perfil de EAS NO es `production` (preview y development). En Expo Go no hace falta.
module.exports = ({ config }) => {
  const clave = process.env.GOOGLE_MAPS_API_KEY;
  const permitirHttp = process.env.EAS_BUILD_PROFILE !== 'production';

  return {
    ...config,
    extra: { ...config.extra, googleMapsConfigurada: Boolean(clave) },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(permitirHttp && {
          NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
          NSLocalNetworkUsageDescription: 'Se conecta con la API de reservas de tu red local.',
        }),
      },
    },
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', clave ? { androidGoogleMapsApiKey: clave } : {}],
      ['expo-build-properties', { android: { usesCleartextTraffic: permitirHttp } }],
    ],
  };
};
