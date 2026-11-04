// Los íconos usan una fuente nativa que no existe en Jest: se reemplazan por un texto con el nombre.
jest.mock('@react-native-vector-icons/ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ name }) => React.createElement(Text, null, `icono:${name}`) };
});
