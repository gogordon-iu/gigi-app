import { AppRegistry } from 'react-native';
import App from '../App';

// Register the app
AppRegistry.registerComponent('GigiMobileApp', () => App);

// Render it
AppRegistry.runApplication('GigiMobileApp', {
  initialProps: {},
  rootTag: document.getElementById('root'),
});
