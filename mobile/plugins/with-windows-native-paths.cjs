const { withGradleProperties } = require('expo/config-plugins');

// ExpoRootProjectPlugin supports this property and otherwise defaults to 1024.
// Windows Ninja needs shorter object paths in this deeply nested workspace.
module.exports = config => withGradleProperties(config, result => {
  const key = 'expo.android.cmakeObjectPathMax';
  result.modResults = result.modResults.filter(item => !(item.type === 'property' && item.key === key));
  if (process.platform === 'win32') result.modResults.push({ type: 'property', key, value: '240' });
  return result;
});
