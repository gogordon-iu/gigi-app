import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import { LogEntry, TransportMode, ConnectionStatus } from '../../types';

export interface ConsoleViewProps {
  connectionMode: TransportMode;
  isMobileBrowser: boolean;
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  selectedBtDevice: any;
  setSelectedBtDevice: (device: any) => void;
  sortedBtDevices: any[];
  connectToGigi: () => void;
  disconnectFromGigi: () => void;
  logFilter: 'all' | 'info' | 'output' | 'error';
  setLogFilter: (filter: 'all' | 'info' | 'output' | 'error') => void;
  handleClearLogs: () => void;
  filteredLogs: LogEntry[];
  logsScrollViewRef: React.RefObject<any>;
}

export const ConsoleView: React.FC<ConsoleViewProps> = ({
  connectionMode,
  isMobileBrowser,
  connectionStatus,
  connectionError,
  selectedBtDevice,
  setSelectedBtDevice,
  sortedBtDevices,
  connectToGigi,
  disconnectFromGigi,
  logFilter,
  setLogFilter,
  handleClearLogs,
  filteredLogs,
  logsScrollViewRef,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Connection Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
        <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
          🔌 Step 1: Connect to Gigi
        </Text>

        {connectionMode === 'serial' ? (
          <View style={{ paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ color: '#2A2738', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
              💻 Direct Bluetooth Connection (Web Serial)
            </Text>
            {isMobileBrowser ? (
              <View
                style={{
                  marginTop: 8,
                  padding: 12,
                  backgroundColor: '#F0F9FF',
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: '#B9E6FE',
                  gap: 6,
                }}
              >
                <Text style={{ color: '#0284C7', fontSize: 13, fontWeight: '700' }}>
                  📱 Bluetooth Connection on Android
                </Text>
                <Text style={{ color: '#2A2738', fontSize: 12, lineHeight: 18, fontWeight: '600' }}>
                  Chrome on Android connects to Bluetooth Classic using the Web Serial API:
                </Text>
                <Text style={{ color: '#475569', fontSize: 11, lineHeight: 16 }}>
                  1. Make sure <Text style={{ fontWeight: '700' }}>orangepi5pro</Text> is paired in your phone's Android Bluetooth settings first.
                  {'\n'}2. Click <Text style={{ fontWeight: '700' }}>Connect to Gigi</Text> below.
                  {'\n'}3. Chrome's device selection prompt will appear (which reads "...wants to connect to a serial port").
                  {'\n'}4. Select <Text style={{ fontWeight: '700' }}>orangepi5pro</Text> from the list to connect via Bluetooth!
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#706B8E', fontSize: 13, marginTop: 4, lineHeight: 18 }}>
                Make sure your Gigi robot is turned on and paired in your computer's Bluetooth settings first.
                Then click Connect below and choose "orangepi5pro" from the browser list.
              </Text>
            )}
          </View>
        ) : (
          <View style={{ paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ color: '#2A2738', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
              📱 Direct Bluetooth Connection (Classic)
            </Text>
            <Text style={{ color: '#706B8E', fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 }}>
              Make sure your Gigi robot is turned on and paired in your phone's Bluetooth settings first.
            </Text>

            {connectionStatus === 'disconnected' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>Select Gigi Bluetooth Device:</Text>
                {sortedBtDevices.length > 0 ? (
                  <View style={{ gap: 8, marginTop: 6 }}>
                    {sortedBtDevices.map((item) => {
                      const isSelected = selectedBtDevice?.address === item.address;
                      return (
                        <TouchableOpacity
                          key={item.address}
                          style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
                          onPress={() => setSelectedBtDevice(item)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.deviceRow}>
                            <Text style={styles.deviceIcon}>🔵</Text>
                            <View style={styles.deviceInfoContainer}>
                              <Text style={styles.deviceName}>{item.name || 'Unnamed Robot'}</Text>
                              <Text style={styles.deviceAddress}>{item.address}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ padding: 12, backgroundColor: '#F4F3F8', borderRadius: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#706B8E', fontSize: 13 }}>No paired Bluetooth devices found.</Text>
                    <Text style={{ color: '#706B8E', fontSize: 12, marginTop: 4 }}>
                      Make sure Bluetooth is enabled and the device is paired.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Connect Trigger */}
        {connectionStatus === 'disconnected' ? (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={connectToGigi}
            activeOpacity={0.85}
            accessibilityRole="button"
            focusable={true}
            accessibilityLabel="Establish Connection with Gigi robot"
          >
            <Text style={styles.buttonText}>Connect to Gigi</Text>
          </TouchableOpacity>
        ) : connectionStatus === 'connecting' ? (
          <View style={[styles.connectButton, styles.buttonDisabled]}>
            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Connecting to Gigi...</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={disconnectFromGigi}
            activeOpacity={0.85}
            accessibilityRole="button"
            focusable={true}
            accessibilityLabel="Terminate Link and disconnect from Gigi robot"
          >
            <Text style={styles.buttonText}>Disconnect from Gigi</Text>
          </TouchableOpacity>
        )}

        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}> Connection Failure: {connectionError}</Text>
          </View>
        )}
      </View>

      {/* Real-time holographic console */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#00FF66' }]} />
        <Text style={styles.cardSectionTitle}>💬 Robot Activity & Chat Stream</Text>
        <View style={styles.consoleToolbar}>
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterChip, logFilter === 'all' && styles.filterChipActive]}
              onPress={() => setLogFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, logFilter === 'all' && styles.filterChipTextActive]}>ALL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, logFilter === 'info' && styles.filterChipActive]}
              onPress={() => setLogFilter('info')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, logFilter === 'info' && styles.filterChipTextActive]}>INFO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, logFilter === 'output' && styles.filterChipActive]}
              onPress={() => setLogFilter('output')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, logFilter === 'output' && styles.filterChipTextActive]}>OUT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterChip, logFilter === 'error' && styles.filterChipActive]}
              onPress={() => setLogFilter('error')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, logFilter === 'error' && styles.filterChipTextActive]}>ERR</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleClearLogs} activeOpacity={0.7} style={styles.flushButton}>
            <Text style={styles.clearText}>🧹 FLUSH</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.consoleContainer}>
          <ScrollView
            ref={logsScrollViewRef}
            style={styles.consoleScrollView}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                let textStyle = styles.logText;
                let icon = '⚙';
                if (log.type === 'success') {
                  textStyle = styles.logSuccess;
                  icon = '🟢';
                } else if (log.type === 'error') {
                  textStyle = styles.logError;
                  icon = '🔴';
                } else if (log.type === 'raw') {
                  textStyle = styles.logRaw;
                  icon = '⚡';
                } else if (log.type === 'info') {
                  textStyle = styles.logInfo;
                  icon = '📡';
                }
                return (
                  <Text key={log.id} style={textStyle}>
                    {icon} [{log.timestamp}] {log.text}
                  </Text>
                );
              })
            ) : (
              <View style={styles.consoleEmptyContainer}>
                <Text style={styles.consolePlaceholder}>🤖 Gigi is ready!</Text>
                <Text style={styles.consoleSubPlaceholder}>Waiting for your command...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
};

export default ConsoleView;
