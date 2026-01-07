export const documentDirectory = '/mock/documents/';
export const cacheDirectory = '/mock/cache/';
export const temporaryDirectory = '/mock/temp/';

const mockAsyncFn = () => Promise.resolve();
const mockAsyncFnWithValue = (value) => Promise.resolve(value);

export const getInfoAsync = () => mockAsyncFnWithValue({
  exists: true,
  isDirectory: false,
  modificationTime: Date.now(),
  size: 1024,
});

export const readAsStringAsync = () => mockAsyncFnWithValue('mock content');
export const writeAsStringAsync = () => mockAsyncFn();
export const deleteAsync = () => mockAsyncFn();
export const moveAsync = () => mockAsyncFn();
export const copyAsync = () => mockAsyncFn();
export const makeDirectoryAsync = () => mockAsyncFn();
export const readDirectoryAsync = () => mockAsyncFnWithValue([]);
export const downloadAsync = () => mockAsyncFnWithValue({ uri: 'mock://uri' });
export const createDownloadResumable = () => ({
  downloadAsync: () => mockAsyncFnWithValue({ uri: 'mock://uri' }),
  pauseAsync: () => mockAsyncFn(),
  resumeAsync: () => mockAsyncFnWithValue({ uri: 'mock://uri' }),
  savable: () => ({}),
});

export default {
  documentDirectory,
  cacheDirectory,
  temporaryDirectory,
  getInfoAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  moveAsync,
  copyAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  downloadAsync,
  createDownloadResumable,
};

