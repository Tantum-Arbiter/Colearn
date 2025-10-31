export const getRandomBytesAsync = jest.fn().mockImplementation((length) => {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(bytes);
});

export const digestStringAsync = jest.fn().mockImplementation((algorithm, data, options) => {
  // Mock hash generation
  const mockHash = 'mock-hash-' + data.slice(0, 8);
  return Promise.resolve(mockHash);
});

export const CryptoDigestAlgorithm = {
  SHA1: 'SHA1',
  SHA256: 'SHA256',
  SHA384: 'SHA384',
  SHA512: 'SHA512',
  MD2: 'MD2',
  MD4: 'MD4',
  MD5: 'MD5',
};

export const CryptoEncoding = {
  HEX: 'hex',
  BASE64: 'base64',
  BASE64URL: 'base64url',
};

export default {
  getRandomBytesAsync,
  digestStringAsync,
  CryptoDigestAlgorithm,
  CryptoEncoding,
};
