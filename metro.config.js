const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

// Bundle the food recognition model (assets/models/food_v1.tflite) like an image.
const config = {
  resolver: { assetExts: [...defaultConfig.resolver.assetExts, 'tflite'] },
};

module.exports = mergeConfig(defaultConfig, config);
