// Extiende app.json. La clave de Google Maps (Android) se lee de la variable de entorno
// GOOGLE_MAPS_API_KEY para no escribirla en el repositorio. En Expo Go no hace falta; en los
// builds de Android sí (ver el README, sección "Mapa"). En iPhone el mapa usa Apple Maps y no
// necesita clave.
module.exports = ({ config }) => {
  const clave = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', clave ? { androidGoogleMapsApiKey: clave } : {}],
    ],
  };
};
