import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import { LogEntry, TransportMode, ConnectionStatus, WifiStatus, WifiNetwork, BtSshStatus, BtShellEntry } from '../../types';

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
  onIdentifyGigi?: () => void;
  connectedBtName?: string;
  isAmbientAlive?: boolean;
  btSshStatus?: BtSshStatus | null;
  isTogglingHotspot?: boolean;
  isTogglingBtSsh?: boolean;
  onStartWifiHotspot?: (ssid?: string, password?: string) => void;
  onStopWifiHotspot?: () => void;
  onToggleBtSsh?: (enabled: boolean) => void;
  btShellEntries?: BtShellEntry[];
  btShellPrompt?: string;
  isBtShellRunning?: boolean;
  onRunBtShellCommand?: (command: string) => void;
  onSendBtShellInput?: (input: string) => void;
  onStopBtShellCommand?: () => void;
  onClearBtShell?: () => void;
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
  btSshStatus,
  isTogglingHotspot,
  isTogglingBtSsh,
  onStartWifiHotspot,
  onStopWifiHotspot,
  onToggleBtSsh,
  btShellEntries = [],
  btShellPrompt,
  isBtShellRunning = false,
  onRunBtShellCommand,
  onSendBtShellInput,
  onStopBtShellCommand,
  onClearBtShell,
}) => {
  const [customSsid, setCustomSsid] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedSSH, setCopiedSSH] = useState(false);
  const [hotspotPassword, setHotspotPassword] = useState('gigi198420');
  const [showHotspotPassword, setShowHotspotPassword] = useState(false);
  const [copiedBtSSH, setCopiedBtSSH] = useState(false);
  const [btShellInput, setBtShellInput] = useState('');
  const [showLocalBtBridgeHelp, setShowLocalBtBridgeHelp] = useState(false);
  const btTerminalScrollRef = useRef<any>(null);

  const connectedBtName =
    typeof selectedBtDevice?.name === 'string' ? selectedBtDevice.name : '';
  const hotspotRouterIp = wifiStatus?.hotspot_ip || wifiStatus?.ip || '10.42.0.1';

  const copyToClipboard = async (text: string, bluetooth = false) => {
    try {
      if (
        typeof navigator === 'undefined' ||
        !navigator.clipboard ||
        !navigator.clipboard.writeText
      ) {
        return;
      }
      await navigator.clipboard.writeText(text);
      if (bluetooth) {
        setCopiedBtSSH(true);
        setTimeout(() => setCopiedBtSSH(false), 2500);
      } else {
        setCopiedSSH(true);
        setTimeout(() => setCopiedSSH(false), 2500);
      }
    } catch {
      if (bluetooth) {
        setCopiedBtSSH(false);
      } else {
        setCopiedSSH(false);
      }
    }
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

      {/* On-Demand Local Router & Bluetooth SSH Card */}
      {connectionStatus === 'connected' && (
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#7C3AED' }]} />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
            🛡️ Step 3: On-Demand Local Router & Bluetooth SSH
          </Text>
          <Text style={{ color: '#706B8E', fontSize: 12, lineHeight: 18, marginTop: 4 }}>
            🔒 Disabled on wakeup for security. Initialize only after connecting via Bluetooth.
          </Text>

          {/* Local Wi-Fi Router */}
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>
              Initialize Gigi's Wi-Fi Router (Local Hotspot)
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: wifiStatus?.hotspot_active ? '#E3FAF0' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: wifiStatus?.hotspot_active ? '#00875A' : '#64748B' }}>
                {wifiStatus?.hotspot_active ? '🟢 ROUTER ACTIVE' : '⚪ ROUTER OFF'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569', marginTop: 10, marginBottom: 10 }}>
              Router SSID (from Bluetooth): {connectedBtName || btSshStatus?.bt_name || 'gigi-hotspot'}
            </Text>

            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#475569' }}>WPA2 Password (minimum 8 characters):</Text>
                <TouchableOpacity onPress={() => setShowHotspotPassword(!showHotspotPassword)}>
                  <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '600' }}>
                    {showHotspotPassword ? 'Hide Password' : 'Show Password'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={hotspotPassword}
                onChangeText={setHotspotPassword}
                placeholder="Enter at least 8 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showHotspotPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!wifiStatus?.hotspot_active && !isTogglingHotspot}
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

            {wifiStatus?.hotspot_active ? (
              <>
                <TouchableOpacity
                  onPress={() => onStopWifiHotspot?.()}
                  disabled={isTogglingHotspot || !onStopWifiHotspot}
                  style={{ backgroundColor: isTogglingHotspot || !onStopWifiHotspot ? '#94A3B8' : '#DC2626', borderRadius: 10, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
                  activeOpacity={0.85}
                >
                  {isTogglingHotspot && <ActivityIndicator size="small" color="#FFFFFF" />}
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>🛑 Stop Gigi's Wi-Fi Router</Text>
                </TouchableOpacity>
                <View style={{ marginTop: 10, backgroundColor: '#0F172A', borderRadius: 8, padding: 12, gap: 6 }}>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                    Hotspot SSID: {wifiStatus.hotspot_ssid || wifiStatus.ssid || connectedBtName}
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                    Hotspot Password: {showHotspotPassword ? hotspotPassword : '••••••••'}
                  </Text>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>
                    Robot Router IP: {hotspotRouterIp}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#38BDF8', fontSize: 13, fontFamily: 'monospace', fontWeight: '700', flexShrink: 1 }}>
                      ssh orangepi@{hotspotRouterIp}
                    </Text>
                    <TouchableOpacity
                      onPress={() => copyToClipboard(`ssh orangepi@${hotspotRouterIp}`)}
                      style={{ backgroundColor: copiedSSH ? '#059669' : '#334155', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginLeft: 8 }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                        {copiedSSH ? '✓ Copied' : '📋 Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (hotspotPassword.length >= 8 && !isTogglingHotspot) {
                    onStartWifiHotspot?.(connectedBtName || btSshStatus?.bt_name || undefined, hotspotPassword);
                  }
                }}
                disabled={hotspotPassword.length < 8 || isTogglingHotspot || !onStartWifiHotspot}
                style={{
                  backgroundColor: hotspotPassword.length < 8 || isTogglingHotspot || !onStartWifiHotspot ? '#94A3B8' : '#7C3AED',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                }}
                activeOpacity={0.85}
              >
                {isTogglingHotspot && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>📡 Initialize Gigi's Wi-Fi Router</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bluetooth SSH */}
          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#334155' }}>
              Enable SSH over Bluetooth
            </Text>
            <View style={{ alignSelf: 'flex-start', backgroundColor: btSshStatus?.enabled ? '#E3FAF0' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginTop: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: btSshStatus?.enabled ? '#00875A' : '#64748B' }}>
                {btSshStatus?.enabled
                  ? `🟢 BT SSH ENABLED (CH ${btSshStatus?.channel || 2})`
                  : '⚪ BT SSH DISABLED'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 10, marginBottom: 12 }}>
              Opens an interactive Linux terminal to Gigi directly inside this browser over Bluetooth (works on Mac & Windows with zero Python setup) while keeping your computer's Wi-Fi/internet active.
            </Text>
            <TouchableOpacity
              onPress={() => onToggleBtSsh?.(!btSshStatus?.enabled)}
              disabled={isTogglingBtSsh || !onToggleBtSsh}
              style={{
                backgroundColor: isTogglingBtSsh || !onToggleBtSsh ? '#94A3B8' : btSshStatus?.enabled ? '#DC2626' : '#7C3AED',
                borderRadius: 10,
                paddingVertical: 12,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
              }}
              activeOpacity={0.85}
            >
              {isTogglingBtSsh && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>
                {btSshStatus?.enabled ? '🛑 Disable SSH over Bluetooth' : '🔵 Enable SSH over Bluetooth'}
              </Text>
            </TouchableOpacity>

            {btSshStatus?.enabled && (
              <View style={{ marginTop: 12, backgroundColor: '#0B1120', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#1E293B', gap: 10 }}>
                {/* Terminal Header */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: '#F8FAFC', fontSize: 13, fontWeight: '800' }}>
                      💻 Browser Bluetooth SSH Terminal
                    </Text>
                    <View style={{ backgroundColor: isBtShellRunning ? '#FEF3C7' : '#064E3B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: isBtShellRunning ? '#D97706' : '#34D399', fontSize: 10, fontWeight: '700' }}>
                        {isBtShellRunning ? '⏳ RUNNING' : '● READY'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isBtShellRunning && onStopBtShellCommand && (
                      <TouchableOpacity
                        onPress={onStopBtShellCommand}
                        style={{ backgroundColor: '#DC2626', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>🛑 Ctrl+C</Text>
                      </TouchableOpacity>
                    )}
                    {onClearBtShell && (
                      <TouchableOpacity
                        onPress={onClearBtShell}
                        style={{ backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#CBD5E1', fontSize: 11, fontWeight: '600' }}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Quick Command Chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[
                    { label: '📂 ls -la', cmd: 'pwd && ls -la' },
                    { label: '🌿 git status', cmd: 'git status -sb' },
                    { label: '⬇️ git pull', cmd: 'git pull' },
                    { label: '💾 df -h', cmd: 'df -h /' },
                    { label: '🤖 bt service', cmd: 'systemctl status gigi-bluetooth --no-pager -n 12' },
                    { label: '🌐 ip addr', cmd: 'ip -br addr' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.label}
                      disabled={isBtShellRunning}
                      onPress={() => onRunBtShellCommand?.(chip.cmd)}
                      style={{
                        backgroundColor: isBtShellRunning ? '#1E293B' : '#1E1B4B',
                        borderColor: '#4338CA',
                        borderWidth: 1,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 6,
                        opacity: isBtShellRunning ? 0.5 : 1,
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={{ color: '#A5B4FC', fontSize: 11, fontFamily: 'monospace', fontWeight: '600' }}>
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Terminal Output Window */}
                <ScrollView
                  ref={btTerminalScrollRef}
                  onContentSizeChange={() => btTerminalScrollRef.current?.scrollToEnd?.({ animated: true })}
                  style={{
                    backgroundColor: '#020617',
                    borderRadius: 8,
                    padding: 10,
                    maxHeight: 280,
                    minHeight: 130,
                    borderWidth: 1,
                    borderColor: '#1E293B',
                  }}
                >
                  {btShellEntries.length === 0 ? (
                    <Text style={{ color: '#64748B', fontSize: 12, fontFamily: 'monospace', lineHeight: 18 }}>
                      Connected to {btSshStatus?.bt_name || connectedBtName || 'gigi'} over Bluetooth.{'\n'}
                      Type any Linux command below (e.g. ls, cd, git pull, sudo systemctl ...) and press Enter.
                    </Text>
                  ) : (
                    btShellEntries.map((entry) => (
                      <View key={entry.id} style={{ marginBottom: 10 }}>
                        <Text selectable style={{ color: '#38BDF8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }}>
                          {entry.prompt || btShellPrompt || `orangepi@${btSshStatus?.bt_name || connectedBtName || 'gigi'}:~/Code/gigi$`} {entry.command}
                        </Text>
                        {entry.output ? (
                          <Text selectable style={{ color: '#E2E8F0', fontSize: 12, fontFamily: 'monospace', lineHeight: 18, marginTop: 2 }}>
                            {entry.output}
                          </Text>
                        ) : null}
                        {entry.error ? (
                          <Text selectable style={{ color: '#F87171', fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>
                            {entry.error}
                          </Text>
                        ) : null}
                        {!entry.running && typeof entry.returncode === 'number' && entry.returncode !== 0 ? (
                          <Text style={{ color: '#FBBF24', fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>
                            [exit code: {entry.returncode}]
                          </Text>
                        ) : null}
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Interactive Command Input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#020617', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ color: isBtShellRunning ? '#FBBF24' : '#34D399', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' }}>
                    {isBtShellRunning
                      ? 'stdin >'
                      : btShellPrompt || btSshStatus?.shell_prompt || `orangepi@${btSshStatus?.bt_name || connectedBtName || 'gigi'}:~/Code/gigi$`}
                  </Text>
                  <TextInput
                    style={{
                      flex: 1,
                      color: '#F8FAFC',
                      fontSize: 13,
                      fontFamily: 'monospace',
                      paddingVertical: 6,
                      outlineStyle: 'none' as any,
                    }}
                    placeholder={isBtShellRunning ? 'Send input to running command...' : 'Type a shell command (ls, cd, git pull, sudo ...)'}
                    placeholderTextColor="#475569"
                    value={btShellInput}
                    onChangeText={setBtShellInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={() => {
                      const trimmed = btShellInput.trim();
                      if (!trimmed) return;
                      if (isBtShellRunning) {
                        onSendBtShellInput?.(btShellInput);
                      } else if (trimmed === 'clear' || trimmed === 'cls') {
                        onClearBtShell?.();
                      } else {
                        onRunBtShellCommand?.(trimmed);
                      }
                      setBtShellInput('');
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      const trimmed = btShellInput.trim();
                      if (!trimmed) return;
                      if (isBtShellRunning) {
                        onSendBtShellInput?.(btShellInput);
                      } else if (trimmed === 'clear' || trimmed === 'cls') {
                        onClearBtShell?.();
                      } else {
                        onRunBtShellCommand?.(trimmed);
                      }
                      setBtShellInput('');
                    }}
                    style={{
                      backgroundColor: isBtShellRunning ? '#D97706' : '#2563EB',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 6,
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                      {isBtShellRunning ? 'Send ↵' : 'Run ↵'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Optional Local Port-Forwarding Toggle */}
                <TouchableOpacity
                  onPress={() => setShowLocalBtBridgeHelp(!showLocalBtBridgeHelp)}
                  style={{ paddingTop: 4 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>
                    {showLocalBtBridgeHelp ? '▼' : '▶'} Advanced: Use external SSH client on port 2222 (requires local Python)
                  </Text>
                </TouchableOpacity>

                {showLocalBtBridgeHelp && (
                  <View style={{ backgroundColor: '#1E293B', borderRadius: 8, padding: 10, gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#38BDF8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', flexShrink: 1 }}>
                        python tools/bt_ssh.py --name {btSshStatus?.bt_name || connectedBtName || 'gigi'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard(`python tools/bt_ssh.py --name ${btSshStatus?.bt_name || connectedBtName || 'gigi'}`, true)}
                        style={{ backgroundColor: copiedBtSSH ? '#059669' : '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginLeft: 8 }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                          {copiedBtSSH ? '✓ Copied' : '📋 Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#38BDF8', fontSize: 12, fontFamily: 'monospace', fontWeight: '700', flexShrink: 1 }}>
                        ssh -p 2222 orangepi@127.0.0.1
                      </Text>
                      <TouchableOpacity
                        onPress={() => copyToClipboard('ssh -p 2222 orangepi@127.0.0.1', true)}
                        style={{ backgroundColor: copiedBtSSH ? '#059669' : '#334155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginLeft: 8 }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>
                          {copiedBtSSH ? '✓ Copied' : '📋 Copy'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
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
