module.exports = {
  preset: '@react-native/jest-preset',
  // Map the native SQLite module to a stub so pure-logic tests can run without
  // a device. See __mocks__/op-sqlite.ts.
  moduleNameMapper: {
    '@op-engineering/op-sqlite': '<rootDir>/__mocks__/op-sqlite.ts',
    // Native PDF / share modules: stubbed so service + template logic can run
    // off-device (see __mocks__). The invoice HTML builder is pure and tested.
    'react-native-html-to-pdf': '<rootDir>/__mocks__/react-native-html-to-pdf.ts',
    'react-native-share': '<rootDir>/__mocks__/react-native-share.ts',
  },
};
