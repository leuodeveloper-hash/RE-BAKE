module.exports = ({ config }) => {
  return {
    ...config,
    runtimeVersion: config.version,
  };
};
