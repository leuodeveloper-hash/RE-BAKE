module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@components': './src/components',
            '@screens': './src/screens',
            '@utils': './src/utils',
            '@constants': './src/constants',
            '@types': './src/types',
            '@data': './src/data',
            '@hooks': './src/hooks',
            '@contexts': './src/contexts',
            '@config': './src/config',
          },
        },
      ],
      // worklets/reanimated 플러그인은 babel-preset-expo(SDK54)가 자동 추가하므로
      // 여기서 수동으로 넣지 않는다 (중복 적용 시 "Failed to create a worklet" 발생)
    ],
  };
};
