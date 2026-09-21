import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { styles } from '../../styles/theme';
import { ConnectionStatus } from '../../types';

export interface InteractionViewProps {
  interactionPrompt: string;
  setInteractionPrompt: (prompt: string) => void;
  isGeneratingInteraction: boolean;
  generateCustomInteraction: () => void;
  currentInteraction: any;
  setCurrentInteraction: (interaction: any) => void;
  isSavingInteraction: boolean;
  saveInteractionToRobot: () => void;
  plannedInteractionFolder: string | null;
  connectionStatus: ConnectionStatus;
  isRobotCalibrated: boolean | null;
  handleCalibrateMotors: () => void;
  sendRawCommand: (cmd: string) => void;
}

export const InteractionView: React.FC<InteractionViewProps> = ({
  interactionPrompt,
  setInteractionPrompt,
  isGeneratingInteraction,
  generateCustomInteraction,
  currentInteraction,
  setCurrentInteraction,
  isSavingInteraction,
  saveInteractionToRobot,
  plannedInteractionFolder,
  connectionStatus,
  isRobotCalibrated,
  handleCalibrateMotors,
  sendRawCommand,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Synthesis Prompt Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
        <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
          A. Design Custom Interaction
        </Text>

        <Text style={styles.inputLabel}>Describe the interaction behavior (states, logic, variables)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={5}
          value={interactionPrompt}
          onChangeText={setInteractionPrompt}
          placeholder="e.g. A Mastermind game where Gigi picks a secret 4-digit number and has the student guess it. gigi gives cows and bulls feedback..."
          placeholderTextColor="#48446B"
        />

        {/* Preset templates */}
        <Text style={styles.exampleHeader}>Preset Templates:</Text>
        <View style={styles.exampleRow}>
          {[
            'Mastermind: A 4-digit secret number guessing game with Gigi',
            'Math Quest: Gigi asks multiplication questions to unlock a chest',
            'Receptionist: Gigi greets visitors, asks their name, tracks faces',
            'Story game: Gigi and user alternate sentences to build a story',
          ].map((exPrompt) => (
            <TouchableOpacity
              key={exPrompt}
              style={styles.exampleChip}
              onPress={() => setInteractionPrompt(exPrompt)}
            >
              <Text style={styles.exampleChipText} numberOfLines={1}>
                💡 {exPrompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isGeneratingInteraction ? (
          <View style={[styles.connectButton, styles.buttonDisabled]}>
            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>COGNITION IN PROGRESS...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={generateCustomInteraction} activeOpacity={0.85}>
            <Text style={styles.buttonText}>GENERATE CUSTOM INTERACTION</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Generated Interaction JSON / Visual Flow Editor Card */}
      {currentInteraction && (
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#FF8C00' }]} />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
            🛠 Synced: {currentInteraction.interaction_title || 'Untitled'}
          </Text>

          <Text style={styles.inputLabel}>State Machine JSON Definition (Edit if needed)</Text>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { minHeight: 250, fontFamily: 'monospace', fontSize: 12, backgroundColor: '#1A1829', color: '#00FF66' },
            ]}
            multiline
            value={typeof currentInteraction === 'string' ? currentInteraction : JSON.stringify(currentInteraction, null, 2)}
            onChangeText={(text) => {
              try {
                const parsed = JSON.parse(text);
                setCurrentInteraction(parsed);
              } catch {
                setCurrentInteraction(text);
              }
            }}
            placeholder="Valid JSON representation..."
            placeholderTextColor="#48446B"
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
            {isSavingInteraction ? (
              <View style={[styles.connectButton, styles.buttonDisabled, { flex: 1 }]}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.connectButton, { flex: 1, backgroundColor: '#00D1FF' }]}
                onPress={saveInteractionToRobot}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>📁 SYNC TO ROBOT</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.connectButton,
                { flex: 1, backgroundColor: '#00FF66' },
                (!plannedInteractionFolder || connectionStatus !== 'connected') && styles.buttonDisabled,
              ]}
              onPress={() => {
                if (plannedInteractionFolder) {
                  if (isRobotCalibrated === false) {
                    Alert.alert(
                      'Calibration Required',
                      'Robot motors are NOT calibrated! For safety and to prevent servo damage, motor movements are locked until calibration is completed.\n\nWould you like to run calibration now?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Calibrate Now', onPress: handleCalibrateMotors },
                      ]
                    );
                    return;
                  }
                  sendRawCommand(`RUN ${plannedInteractionFolder}`);
                }
              }}
              disabled={!plannedInteractionFolder || connectionStatus !== 'connected'}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>⚡ RUN INTERACTION</Text>
            </TouchableOpacity>
          </View>

          {!plannedInteractionFolder && (
            <Text style={{ fontSize: 12, color: '#FF8C00', textAlign: 'center', marginTop: 10, fontWeight: '600' }}>
              ⚠️ Save to robot first before running.
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

export default InteractionView;
