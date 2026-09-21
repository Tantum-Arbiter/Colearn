// Mock for expo/virtual/env module -babel-preset-expo rewrites
// process.env.EXPO_PUBLIC_* reads to this module's `env` export, so delegate
// to the real process.env to let tests set/unset EXPO_PUBLIC_* vars naturally
module.exports = { env: process.env };
