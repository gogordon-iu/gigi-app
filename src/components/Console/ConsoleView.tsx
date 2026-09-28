import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import { LogEntry, TransportMode, ConnectionStatus, WifiStatus, WifiNetwork } from '../../types';

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
  wifiStatus?: WifiStatus | null;
  wifiNetworks?: WifiNetwork[];
  isScanningWifi?: boolean;
  isConnectingWifi?: boolean;
  onScanWifi?: () => void;
  onConnectWifi?: (ssid: string, password: string) => void;
  onSleepGigi?: () => void;
  onWakeGigi?: () => void;
  isAmbientAlive?: boolean;
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
  wifiStatus,
  wifiNetworks,
  isScanningWifi,
  isConnectingWifi,
  onScanWifi,
  onConnectWifi,
  onSleepGigi,
  onWakeGigi,
  isAmbientAlive,
}) => {
  const [customSsid, setCustomSsid] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSSH, setCopiedSSH] = useState(false);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedSSH(true);
    setTimeout(() => setCopiedSSH(false), 2500);
  };
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

      {/* Robot Wi-Fi & Developer SSH Card (Visible when connected) */}
      {connectionStatus === 'connected' && (
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#0284C7' }]} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
              🌐 Step 2: Robot Wi-Fi & Developer SSH
            </Text>
            {wifiStatus?.connected ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E3FAF0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#A3EAD0' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#00875A' }}>🟢 ONLINE</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4E5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1, borderColor: '#FFD8B3' }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>⚠️ OFFLINE</Text>
              </View>
            )}
          </View>

          {/* Current Status Box */}
          <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 }}>
            {wifiStatus?.connected ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Active Wi-Fi Network:</Text>
                  <Text style={{ fontSize: 14, color: '#0F172A', fontWeight: '700' }}>📶 {wifiStatus.ssid}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '600' }}>Robot IP Address:</Text>
                  <Text style={{ fontSize: 14, color: '#0284C7', fontWeight: '700', fontFamily: 'monospace' }}>{wifiStatus.ip}</Text>
                </View>

                {/* Developer SSH Command Box */}
                <View style={{ marginTop: 6, backgroundColor: '#0F172A', borderRadius: 8, padding: 12 }}>
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                    💻 Developer SSH Terminal Link:
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#38BDF8', fontSize: 13, fontFamily: 'monospace', fontWeight: '700', flexShrink: 1 }}>
                      ssh orangepi@{wifiStatus.ip}
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(`ssh orangepi@${wifiStatus.ip}`)}
                      style={{ backgroundColor: copiedSSH ? '#059669' : '#334155', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                        {copiedSSH ? '✓ Copied' : '📋 Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#64748B', fontSize: 10, marginTop: 4 }}>
                    Password: <Text style={{ color: '#CBD5E1', fontFamily: 'monospace' }}>orangepi</Text>
                  </Text>
                </View>
              </>
            ) : (
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 13, color: '#B45309', fontWeight: '700' }}>
                  Gigi is not connected to local Wi-Fi.
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                  Scan and join your Wi-Fi network below to enable SSH access and remote programming.
                </Text>
              </View>
            )}
          </View>

          {/* Wi-Fi Scanner and Join Form */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>
                Join a Wi-Fi Network
              </Text>
              <TouchableOpacity
                onPress={onScanWifi}
                disabled={isScanningWifi}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isScanningWifi ? '#E2E8F0' : '#E0F2FE',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  gap: 6,
                }}
                activeOpacity={0.7}
              >
                {isScanningWifi ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <Text style={{ fontSize: 12 }}>📡</Text>
                )}
                <Text style={{ fontSize: 12, fontWeight: '700', color: isScanningWifi ? '#94A3B8' : '#0369A1' }}>
                  {isScanningWifi ? 'Scanning...' : 'Scan Networks'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Scanned Networks Pills */}
            {wifiNetworks && wifiNetworks.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4, marginBottom: 10 }}
              >
                {wifiNetworks.map((net) => {
                  const isSelected = (customSsid || wifiStatus?.ssid) === net.ssid;
                  return (
                    <TouchableOpacity
                      key={net.ssid}
                      onPress={() => setCustomSsid(net.ssid)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                        borderColor: isSelected ? '#3B82F6' : '#CBD5E1',
                        borderWidth: 1.5,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        gap: 6,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 12 }}>📶</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#1D4ED8' : '#334155' }}>
                        {net.ssid}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748B' }}>{net.signal}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* SSID Input */}
            <View style={{ marginBottom: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 }}>Network Name (SSID):</Text>
              <TextInput
                value={customSsid}
                onChangeText={setCustomSsid}
                placeholder="Enter or select Wi-Fi SSID"
                placeholderTextColor="#94A3B8"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: '#0F172A',
                }}
              />
            </View>

            {/* Password Input */}
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>Wi-Fi Password:</Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={{ fontSize: 11, color: '#0284C7', fontWeight: '600' }}>
                    {showPassword ? 'Hide Password' : 'Show Password'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={customPassword}
                onChangeText={setCustomPassword}
                placeholder="Enter Wi-Fi password (leave empty if open)"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#CBD5E1',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: '#0F172A',
                }}
              />
            </View>

            {/* Connect Button */}
            <TouchableOpacity
              onPress={() => onConnectWifi?.(customSsid, customPassword)}
              disabled={!customSsid.trim() || isConnectingWifi}
              style={{
                backgroundColor: !customSsid.trim() || isConnectingWifi ? '#94A3B8' : '#0284C7',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
              activeOpacity={0.85}
            >
              {isConnectingWifi ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Connecting to {customSsid}...</Text>
                </>
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Connect Gigi to Wi-Fi</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Quick Sleep & Wake Controls */}
          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                Robot Idle State: {isAmbientAlive ? '🟢 Alive & Tracking' : '💤 Resting'}
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                {isAmbientAlive ? 'Gigi is actively tracking and looking around' : 'Motors and sensors are resting'}
              </Text>
            </View>
            {isAmbientAlive ? (
              <TouchableOpacity
                onPress={onSleepGigi}
                style={{ backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>💤 Sleep</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onWakeGigi}
                style={{ backgroundColor: '#E0F2FE', borderWidth: 1, borderColor: '#7DD3FC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>☀️ Wake Up</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

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
