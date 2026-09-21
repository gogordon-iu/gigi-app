import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '../../styles/theme';

export interface LockScreenProps {
  passcode: string;
  setPasscode: (val: string) => void;
  authError: string;
  handleAuthenticate: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  passcode,
  setPasscode,
  authError,
  handleAuthenticate,
}) => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.authContainer}>
        <View style={styles.authCard}>
          <Text style={styles.authEmoji}>🤖</Text>
          <Text style={styles.authTitle}>GIGI ROBOTICS</Text>
          <Text style={styles.authSubtitle}>Access Lock Screen</Text>

          <TextInput
            style={styles.authInput}
            secureTextEntry
            value={passcode}
            onChangeText={setPasscode}
            placeholder="Enter Access Passcode"
            accessibilityLabel="Passcode input field"
            placeholderTextColor="#8F8AA9"
            onSubmitEditing={handleAuthenticate}
          />

          {authError ? <Text style={styles.authErrorText}>{authError}</Text> : null}

          <TouchableOpacity
            style={styles.authBtn}
            onPress={handleAuthenticate}
            activeOpacity={0.85}
            accessibilityRole="button"
            focusable={true}
            accessibilityLabel="Unlock System button"
          >
            <Text style={styles.authBtnText}>UNLOCK SYSTEM</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default LockScreen;
