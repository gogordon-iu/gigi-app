import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import { ScriptItem, ConnectionStatus } from '../../types';
import { CalibrationBanner } from './CalibrationBanner';

export interface ActivitiesViewProps {
  connectionStatus: ConnectionStatus;
  handlePing: () => void;
  isLoadingScripts: boolean;
  isRobotCalibrated: boolean | null;
  handleCalibrateMotors: () => void;
  scripts: ScriptItem[];
  selectedCategory: 'demo' | 'script';
  setSelectedCategory: (cat: 'demo' | 'script') => void;
  selectedScript: string | null;
  setSelectedScript: (script: string | null) => void;
  isRunning: boolean;
  runningScriptInfo: any;
  handleRunScript: () => void;
  handleStopScript: () => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  connectionStatus,
  handlePing,
  isLoadingScripts,
  isRobotCalibrated,
  handleCalibrateMotors,
  scripts,
  selectedCategory,
  setSelectedCategory,
  selectedScript,
  setSelectedScript,
  isRunning,
  runningScriptInfo,
  handleRunScript,
  handleStopScript,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#A000FF' }]} />
        <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
          🤖 Robot Activities
        </Text>

        {connectionStatus !== 'connected' ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 24, marginBottom: 12, textAlign: 'center' }}>⚠️</Text>
            <Text style={styles.emptyText}>Gigi is Offline</Text>
            <Text style={[styles.emptySubText, { textAlign: 'center', marginTop: 4 }]}>
              Please establish a connection in the "Chat & Manual Control" tab first before selecting activities.
            </Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.pingButton}
              onPress={handlePing}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Get refreshed list of activities from Gigi robot"
            >
              {isLoadingScripts ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#5E43F3" />
                  <Text style={styles.pingButtonText}>Retrieving Activities...</Text>
                </View>
              ) : (
                <Text style={styles.pingButtonText}>📡 GET THE FULL LIST OF ACTIVITIES</Text>
              )}
            </TouchableOpacity>

            {/* Motor Calibration Status Banner */}
            <CalibrationBanner
              isRobotCalibrated={isRobotCalibrated}
              onCalibrate={handleCalibrateMotors}
            />

            {scripts.length > 0 ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 15 }]}>Available Activities:</Text>

                {/* Category Selector/Tabs */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#F4F3F8',
                    borderRadius: 10,
                    padding: 3,
                    borderWidth: 1.5,
                    borderColor: '#E2DFF0',
                    marginVertical: 10,
                  }}
                >
                  {(['demo', 'script'] as const).map((cat) => {
                    const isActive = selectedCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          alignItems: 'center',
                          borderRadius: 8,
                          backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                        }}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#5E43F3' : '#4E4B66' }}>
                          {cat === 'demo' ? '📁 Demo Folder' : '✨ Custom Activities'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Scrollable list of script chips */}
                <View style={styles.scriptListContainer}>
                  {scripts
                    .filter((s) => s.type === selectedCategory)
                    .map((s) => {
                      const isSelected = selectedScript === s.name;
                      return (
                        <TouchableOpacity
                          key={s.name}
                          style={[styles.scriptChip, isSelected && styles.scriptChipSelected]}
                          onPress={() => setSelectedScript(s.name)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.scriptChipText, isSelected && styles.scriptChipTextSelected]}>
                            {s.displayName || s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>

                {/* Execution Control Row */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.runButton, (!selectedScript || isRunning) && styles.buttonDisabled]}
                    disabled={!selectedScript || isRunning}
                    onPress={handleRunScript}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>🚀 RUN ACTIVITY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.stopButton, !isRunning && styles.buttonDisabled]}
                    disabled={!isRunning}
                    onPress={handleStopScript}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>🛑 STOP</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              !isLoadingScripts && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No activities loaded yet.</Text>
                  <Text style={styles.emptySubText}>
                    Click the button above to load activities from the Gigi robot.
                  </Text>
                </View>
              )
            )}

            {/* Running Status Badge */}
            {isRunning && runningScriptInfo && (
              <View style={styles.runningBadge}>
                <Text style={styles.runningText}>
                  ⚡ Running: {runningScriptInfo.name} (PID: {runningScriptInfo.pid})
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default ActivitiesView;
