import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  NativeModules,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import TcpSocket from 'react-native-tcp-socket';
import { AZURE_OPENAI_CONFIG } from './config.local';
import {
  sha256,
  decrypt,
  encrypt,
  getAdminPasscode,
  getTokenSalt,
} from './src/utils/crypto';
import { styles } from './src/styles/theme';
import {
  LogEntry,
  ScriptItem,
  TransportMode,
  ConnectionStatus,
  IssuedToken,
  WifiStatus,
  WifiNetwork,
  BtSshStatus,
  BtShellEntry,
  MotorJointName,
  MotorCalibrationMap,
  CalibrationStatusInfo,
  ChannelScanResult,
} from './src/types';
import { STRATEGY_CATALOG_STR } from './src/constants/strategies';
import { getActivityMetadata } from './src/constants/activities';
// Modular View Components
import { LockScreen } from './src/components/Auth/LockScreen';
import { ConsoleView } from './src/components/Console/ConsoleView';
import { ActivitiesView } from './src/components/Activities/ActivitiesView';
import {
  MotorCalibrationView,
  DEFAULT_MOTOR_CALIBRATION_MAP,
} from './src/components/Calibration/MotorCalibrationView';
import { PlannerView } from './src/components/Planner/PlannerView';
import { InteractionView } from './src/components/Interaction/InteractionView';
import { ManagerView } from './src/components/Manager/ManagerView';

// Conditional import for Bluetooth Classic (Mobile native only)
let RNBluetoothClassic: any = null;
try {
  RNBluetoothClassic = require('react-native-bluetooth-classic').default;
} catch {
  // Bluetooth classic library not linked natively or running on web
}

const PermissionsAndroid = Platform.OS === 'android' ? require('react-native').PermissionsAndroid : null;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [decryptedApiKey, setDecryptedApiKey] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loggedInUser, setLoggedInUser] = useState('');

  const handleLogout = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('gigi_passcode');
      }
    } catch {}
    setIsAuthenticated(false);
    setPasscode('');
    setDecryptedApiKey('');
    setUserRole(null);
    setLoggedInUser('');
  };

  const authenticateWithKey = (key: string) => {
    setAuthError('');
    const trimmed = key.trim();
    const currentAdminPasscode = getAdminPasscode();
    const currentSalt = getTokenSalt();

    // 1. Admin login via master passcode
    if (trimmed === currentAdminPasscode) {
      let adminKey = '';
      try {
        if (typeof localStorage !== 'undefined') {
          adminKey = localStorage.getItem('gigi_admin_api_key') || '';
        }
      } catch {}
      if (!adminKey) {
        try {
          adminKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, currentAdminPasscode);
        } catch {}
      }

      setDecryptedApiKey(adminKey);
      setUserRole('admin');
      setLoggedInUser('Admin');
      setIsAuthenticated(true);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('gigi_passcode', currentAdminPasscode);
        }
      } catch {}
      return;
    }

    // 2. Token-based login for users (encrypted hex or Mrs_Smith|2026-12-31|signature)
    let decryptedToken = trimmed;
    if (!trimmed.includes('|') && trimmed !== currentAdminPasscode) {
      try {
        decryptedToken = decrypt(trimmed, currentSalt);
      } catch {}
    }
    const parts = decryptedToken.split('|');

    // Get current blacklist
    let curBlacklist: string[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gigi_blacklist');
        if (stored) {
          curBlacklist = JSON.parse(stored);
        }
      }
    } catch {}

    if (parts.length === 4) {
      const [username, expiration, apiKey, signature] = parts;
      const expectedSig = sha256(username + '|' + expiration + '|' + apiKey + '|' + currentSalt).substring(0, 16);
      if (signature === expectedSig) {
        const expDate = new Date(expiration);
        const now = new Date();
        if (isNaN(expDate.getTime()) || expDate < now) {
          setAuthError('Access Denied: This token has expired.');
          return;
        }
        if (curBlacklist.includes(username.toLowerCase())) {
          setAuthError('Access Denied: This account has been revoked.');
          return;
        }
        setDecryptedApiKey(apiKey);
        setUserRole('user');
        setLoggedInUser(username.replace('_', ' '));
        setIsAuthenticated(true);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('gigi_passcode', trimmed);
          }
        } catch {}
        return;
      } else {
        setAuthError('Access Denied: Invalid Token Signature.');
        return;
      }
    } else if (parts.length === 3) {
      const [username, expiration, signature] = parts;
      const expectedSig = sha256(username + '|' + expiration + '|' + currentSalt);
      if (signature === expectedSig) {
        const expDate = new Date(expiration);
        const now = new Date();
        if (isNaN(expDate.getTime()) || expDate < now) {
          setAuthError('Access Denied: This token has expired.');
          return;
        }
        if (curBlacklist.includes(username.toLowerCase())) {
          setAuthError('Access Denied: This account has been revoked.');
          return;
        }
        try {
          const derivedKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, currentAdminPasscode);
          setDecryptedApiKey(derivedKey);
          setUserRole('user');
          setLoggedInUser(username.replace('_', ' '));
          setIsAuthenticated(true);
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('gigi_passcode', trimmed);
            }
          } catch {}
          return;
        } catch {
          setAuthError('System Error: Decryption failed.');
          return;
        }
      } else {
        setAuthError('Access Denied: Invalid Token Signature.');
        return;
      }
    }

    setAuthError('Access Denied: Invalid Passcode or Token.');
  };

  const handleAuthenticate = () => {
    authenticateWithKey(passcode);
  };

  useEffect(() => {
    // Check if key query parameter is present in URL (Web)
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('key');
        if (keyParam) {
          const cleanUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
          authenticateWithKey(keyParam);
          return;
        }
      }
    } catch {}

    // Auto-login from localStorage check:
    try {
      if (typeof localStorage !== 'undefined') {
        const savedPasscode = localStorage.getItem('gigi_passcode');
        if (savedPasscode) {
          const trimmed = savedPasscode.trim();
          const currentAdmin = getAdminPasscode();
          if (trimmed === currentAdmin) {
            let adminKey = localStorage.getItem('gigi_admin_api_key') || '';
            if (!adminKey) {
              try {
                adminKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, currentAdmin);
              } catch {}
            }
            setDecryptedApiKey(adminKey);
            setUserRole('admin');
            setLoggedInUser('Admin');
            setIsAuthenticated(true);
          } else {
            authenticateWithKey(trimmed);
          }
        }
      }
    } catch {}
  }, []);

  if (!isAuthenticated) {
    return (
      <LockScreen
        passcode={passcode}
        setPasscode={setPasscode}
        authError={authError}
        handleAuthenticate={handleAuthenticate}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <AppContent
          decryptedApiKey={decryptedApiKey}
          setDecryptedApiKey={setDecryptedApiKey}
          isAuthenticated={isAuthenticated}
          userRole={userRole}
          loggedInUser={loggedInUser}
          handleLogout={handleLogout}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

interface AppContentProps {
  decryptedApiKey: string;
  setDecryptedApiKey: (key: string) => void;
  isAuthenticated: boolean;
  userRole: 'admin' | 'user' | null;
  loggedInUser: string;
  handleLogout: () => void;
}

function AppContent({
  decryptedApiKey,
  setDecryptedApiKey,
  isAuthenticated,
  userRole,
  loggedInUser,
  handleLogout,
}: AppContentProps) {
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'console' | 'activities' | 'calibration' | 'planner' | 'interaction' | 'manager'>('console');
  const isMobileBrowser =
    Platform.OS === 'web' &&
    typeof navigator !== 'undefined' &&
    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Manager Panel States
  const [newUserName, setNewUserName] = useState('');
  const [newUserExpiration, setNewUserExpiration] = useState('2026-12-31');
  const [generatedToken, setGeneratedToken] = useState('');
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [issuedTokens, setIssuedTokens] = useState<IssuedToken[]>([]);
  const [adminApiKey, setAdminApiKey] = useState('');
  const [activeQrUser, setActiveQrUser] = useState<string | null>(null);

  const handleSaveAdminApiKey = (key: string) => {
    setAdminApiKey(key);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gigi_admin_api_key', key);
      }
    } catch {}
  };

  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedBlacklist = localStorage.getItem('gigi_blacklist');
        if (storedBlacklist) {
          setBlacklist(JSON.parse(storedBlacklist));
        }
        const storedTokens = localStorage.getItem('gigi_issued_tokens');
        if (storedTokens) {
          setIssuedTokens(JSON.parse(storedTokens));
        }
        const savedKey = localStorage.getItem('gigi_admin_api_key');
        if (savedKey) {
          setAdminApiKey(savedKey);
        } else {
          try {
            const configKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, getAdminPasscode());
            if (configKey) {
              setAdminApiKey(configKey);
              localStorage.setItem('gigi_admin_api_key', configKey);
            }
          } catch {}
        }
      }
    } catch {}
  }, []);

  const generateUserToken = () => {
    const name = newUserName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) {
      Alert.alert('Error', 'Please enter a user name or identifier.');
      return;
    }

    let apiKeyToEmbed = adminApiKey;
    if (!apiKeyToEmbed) {
      try {
        if (typeof localStorage !== 'undefined') {
          apiKeyToEmbed = localStorage.getItem('gigi_admin_api_key') || '';
        }
      } catch {}
    }
    if (!apiKeyToEmbed) {
      try {
        apiKeyToEmbed = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, getAdminPasscode());
      } catch {}
    }

    if (!apiKeyToEmbed) {
      Alert.alert('Error', 'Azure OpenAI API Key is missing. Please save the API Key in the settings below first.');
      return;
    }

    const currentSalt = getTokenSalt();
    const signature = sha256(name + '|' + newUserExpiration + '|' + apiKeyToEmbed + '|' + currentSalt).substring(0, 16);
    const rawToken = `${name}|${newUserExpiration}|${apiKeyToEmbed}|${signature}`;
    const token = encrypt(rawToken, currentSalt);
    setGeneratedToken(token);
    addLog(`Access token generated for ${name} (expires: ${newUserExpiration})`, 'success');
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gigi_issued_tokens');
        let currentTokens: IssuedToken[] = [];
        if (stored) {
          currentTokens = JSON.parse(stored);
        }
        currentTokens = currentTokens.filter((t) => t.username !== name);
        const newObj: IssuedToken = {
          username: name,
          token: token,
          expiration: newUserExpiration,
          generationCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        const updated = [newObj, ...currentTokens];
        localStorage.setItem('gigi_issued_tokens', JSON.stringify(updated));
        setIssuedTokens(updated);
      }
    } catch {}
  };

  const handleToggleBlacklist = (user: string) => {
    const lowerUser = user.toLowerCase();
    let updated: string[];
    if (blacklist.includes(lowerUser)) {
      updated = blacklist.filter((u) => u !== lowerUser);
      addLog(`Restored access for user: ${user}`, 'info');
    } else {
      updated = [...blacklist, lowerUser];
      addLog(`Revoked access for user: ${user}`, 'error');
    }
    setBlacklist(updated);
    try {
      localStorage.setItem('gigi_blacklist', JSON.stringify(updated));
    } catch {}
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          Alert.alert('Copied', 'Token copied to clipboard.');
        })
        .catch(() => {
          Alert.alert('Copy Failed', 'Please select and copy the token manually.');
        });
      return;
    }
    Alert.alert('Copied', 'Token copied to clipboard.');
  };

  const exportBackup = () => {
    try {
      const backupData = {
        issuedTokens,
        blacklist,
        adminApiKey,
        exportDate: new Date().toISOString(),
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', 'gigi_tokens_backup.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      addLog('Backup file downloaded successfully', 'success');
    } catch (e: any) {
      Alert.alert('Export Failed', e.message);
    }
  };

  const importBackup = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Not Supported', 'Backup import is only supported on the web manager panel.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const backupData = JSON.parse(event.target.result);
          if (backupData.issuedTokens && Array.isArray(backupData.issuedTokens)) {
            setIssuedTokens(backupData.issuedTokens);
            localStorage.setItem('gigi_issued_tokens', JSON.stringify(backupData.issuedTokens));
          }
          if (backupData.blacklist && Array.isArray(backupData.blacklist)) {
            setBlacklist(backupData.blacklist);
            localStorage.setItem('gigi_blacklist', JSON.stringify(backupData.blacklist));
          }
          if (backupData.adminApiKey) {
            setAdminApiKey(backupData.adminApiKey);
            localStorage.setItem('gigi_admin_api_key', backupData.adminApiKey);
          }
          Alert.alert('Import Success', 'Tokens list and configurations restored successfully!');
          addLog('Tokens database restored from backup file', 'success');
        } catch (err: any) {
          Alert.alert('Import Failed', 'Invalid backup file format: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Planner States
  const [activityPrompt, setActivityPrompt] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [generatingImages, setGeneratingImages] = useState<{ [key: string]: boolean }>({});
  const [selectedImageSize, setSelectedImageSize] = useState<'1024x1024' | '512x512' | '256x256'>('1024x1024');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [plannedFolder, setPlannedFolder] = useState<string | null>(null);
  const imageBase64Cache = useRef<{ [filename: string]: string }>({});

  // Interaction Designer States
  const [interactionPrompt, setInteractionPrompt] = useState('');
  const [isGeneratingInteraction, setIsGeneratingInteraction] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<any>(null);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [plannedInteractionFolder, setPlannedInteractionFolder] = useState<string | null>(null);

  // Connection & Robot States
  const [connectionMode] = useState<TransportMode>(Platform.OS === 'web' ? 'serial' : 'bluetooth');
  const [tcpHost] = useState('10.0.0.223');
  const [tcpPort] = useState('8888');
  const [wsPort] = useState('8889');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [customScript] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningScriptInfo, setRunningScriptInfo] = useState<any>(null);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [isRobotCalibrated, setIsRobotCalibrated] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'plan' | 'custom'>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');
  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedBtDevice, setSelectedBtDevice] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'output' | 'error'>('all');
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [isScanningWifi, setIsScanningWifi] = useState(false);
  const [isConnectingWifi, setIsConnectingWifi] = useState(false);
  const [isAmbientAlive, setIsAmbientAlive] = useState(false);
  const [connectedBtName, setConnectedBtName] = useState<string | null>(null);
  const [btSshStatus, setBtSshStatus] = useState<BtSshStatus | null>(null);
  const [isTogglingHotspot, setIsTogglingHotspot] = useState(false);
  const [isTogglingBtSsh, setIsTogglingBtSsh] = useState(false);
  const [btShellEntries, setBtShellEntries] = useState<BtShellEntry[]>([]);
  const [btShellPrompt, setBtShellPrompt] = useState<string>('');
  const [isBtShellRunning, setIsBtShellRunning] = useState<boolean>(false);

  // Interactive Motor Calibration Studio States
  const [motorCalibration, setMotorCalibration] = useState<MotorCalibrationMap>(
    DEFAULT_MOTOR_CALIBRATION_MAP
  );
  const [calibrationStatusInfo, setCalibrationStatusInfo] =
    useState<CalibrationStatusInfo | null>(null);
  const [isSavingCalibration, setIsSavingCalibration] = useState<boolean>(false);
  const [isTestingGesture, setIsTestingGesture] = useState<boolean>(false);
  const [activeGestureName, setActiveGestureName] = useState<string | null>(null);
  const [isScanningChannels, setIsScanningChannels] = useState<boolean>(false);
  const [scanProgressChannel, setScanProgressChannel] = useState<number | null>(null);
  const [channelScanResult, setChannelScanResult] = useState<ChannelScanResult | null>(null);

  const activeConnection = useRef<{ send: (data: string) => Promise<void>; disconnect: () => void } | null>(null);
  const dataBuffer = useRef<string>('');
  const handshakeTimeoutRef = useRef<any>(null);
  const fallbackQueryRef = useRef<any>(null);
  const btSubscription = useRef<any>(null);
  const logsScrollViewRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const newEntry: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type,
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'info') return log.type === 'info' || log.type === 'success';
    if (logFilter === 'output') return log.type === 'raw' || log.type === 'output';
    if (logFilter === 'error') return log.type === 'error';
    return true;
  });

  const sortedBtDevices = [...btDevices].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    const keywords = ['gigi', 'orangepi', 'opi', 'robot'];
    const matchesA = keywords.some((kw) => nameA.includes(kw));
    const matchesB = keywords.some((kw) => nameB.includes(kw));
    if (matchesA && !matchesB) return -1;
    if (!matchesA && matchesB) return 1;
    return nameA.localeCompare(nameB);
  });

  // Handle incoming robot transport data
  const handleIncomingData = (dataStr: string) => {
    const normalized = dataStr.replace(/\r/g, '\n');
    dataBuffer.current += normalized;
    while (dataBuffer.current.includes('\n')) {
      const parts = dataBuffer.current.split('\n');
      const line = parts[0].trim();
      dataBuffer.current = parts.slice(1).join('\n');
      if (!line) continue;

      try {
        const parsed = JSON.parse(line);
        processServerMessage(parsed);
      } catch {
        addLog(`[Raw]: ${line}`, 'raw');
      }
    }
  };

  const processServerMessage = (msg: any) => {
    if (typeof msg.bt_name === 'string' && msg.bt_name) {
      setConnectedBtName(msg.bt_name);
    }

    if (typeof msg.calibrated === 'boolean') {
      setIsRobotCalibrated((prev) => {
        if (prev !== msg.calibrated) {
          addLog(`Gigi motor calibration: ${msg.calibrated ? 'CALIBRATED 🟢' : 'UNCALIBRATED ⚠️'}`, msg.calibrated ? 'success' : 'error');
        }
        return msg.calibrated;
      });
    }

    if (msg.wifi) {
      setWifiStatus(msg.wifi);
    }
    if (msg.bt_ssh) {
      setBtSshStatus(msg.bt_ssh);
      if (msg.bt_ssh.shell_prompt) {
        setBtShellPrompt(msg.bt_ssh.shell_prompt);
      }
    }

    if (msg.status === 'ready') {
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = null;
      }
      if (fallbackQueryRef.current) {
        clearTimeout(fallbackQueryRef.current);
        fallbackQueryRef.current = null;
      }
      addLog('Handshake completed successfully!', 'success');
      if (msg.wifi) {
        setWifiStatus(msg.wifi);
      }
      setIsLoadingScripts(true);
      sendRawCommand('STATUS');
      sendRawCommand('LIST');
      sendRawCommand('CALIB_GET');
    } else if (msg.status === 'calib_data') {
      if (typeof msg.calibrated === 'boolean') {
        setIsRobotCalibrated(msg.calibrated);
      }
      if (msg.calibration_status) {
        setCalibrationStatusInfo(msg.calibration_status);
      }
      if (msg.motors && typeof msg.motors === 'object') {
        setMotorCalibration((prev) => ({
          ...prev,
          ...msg.motors,
        }));
      }
      addLog('Loaded motor calibration profile from Gigi.', 'success');
    } else if (msg.status === 'calib_moved') {
      addLog(
        `Servo CH ${msg.channel}${msg.joint ? ` (${msg.joint})` : ''} → ${msg.pwm} PWM`,
        'info'
      );
    } else if (msg.status === 'calib_wiggled') {
      addLog(msg.message || `Wiggled servo channel ${msg.channel}.`, 'info');
    } else if (msg.status === 'calib_scan_started') {
      setIsScanningChannels(true);
      setScanProgressChannel(0);
      setChannelScanResult(null);
      addLog(msg.message || 'Scanning 16 PCA9685 channels via Torso camera...', 'info');
    } else if (msg.status === 'calib_scan_progress') {
      setIsScanningChannels(true);
      if (typeof msg.channel === 'number') {
        setScanProgressChannel(msg.channel);
      }
    } else if (msg.status === 'calib_scan_completed') {
      setIsScanningChannels(false);
      setScanProgressChannel(null);
      const scanRes: ChannelScanResult = {
        active_channels: Array.isArray(msg.active_channels) ? msg.active_channels : [],
        channels: Array.isArray(msg.channels) ? msg.channels : [],
        suggested_assignments:
          msg.suggested_assignments && typeof msg.suggested_assignments === 'object'
            ? msg.suggested_assignments
            : {},
        message: msg.message,
      };
      setChannelScanResult(scanRes);
      addLog(
        msg.message || `Auto-detected active channels: ${scanRes.active_channels.join(', ')}`,
        'success'
      );
    } else if (msg.status === 'calib_released') {
      setIsTestingGesture(false);
      setActiveGestureName(null);
      setIsScanningChannels(false);
      setScanProgressChannel(null);
      addLog(msg.message || 'All motor PWM channels released.', 'info');
    } else if (msg.status === 'calib_homed') {
      addLog(msg.message || 'All motors moved to center home pose.', 'success');
    } else if (msg.status === 'calib_gesture_started') {
      setIsTestingGesture(true);
      setActiveGestureName(msg.gesture || null);
      addLog(msg.message || `Testing gesture "${msg.gesture}"...`, 'info');
    } else if (msg.status === 'calib_gesture_completed') {
      setIsTestingGesture(false);
      setActiveGestureName(null);
      addLog(msg.message || `Finished gesture "${msg.gesture}".`, 'success');
    } else if (msg.status === 'calib_saved') {
      setIsSavingCalibration(false);
      if (typeof msg.calibrated === 'boolean') {
        setIsRobotCalibrated(msg.calibrated);
      }
      if (msg.calibration_status) {
        setCalibrationStatusInfo(msg.calibration_status);
      }
      if (msg.motors && typeof msg.motors === 'object') {
        setMotorCalibration((prev) => ({
          ...prev,
          ...msg.motors,
        }));
      }
      addLog(msg.message || 'Motor calibration saved to robot!', 'success');
      Alert.alert(
        'Calibration Saved',
        msg.calibrated
          ? 'Motor calibration saved to Gigi! Physical movement is now unlocked.'
          : 'Calibration file saved, but some required joints still have uncalibrated or template bounds (290..310). Please verify Neck, Torso, and Shoulders.'
      );
    } else if (msg.status === 'list') {
      if (typeof msg.calibrated === 'boolean') {
        setIsRobotCalibrated(msg.calibrated);
      }
      if (msg.wifi) {
        setWifiStatus(msg.wifi);
      }
      // Deduplicate core demo list
      const rawDemos: string[] = Array.from(new Set<string>(msg.available_demos || []));
      const coreList: ScriptItem[] = rawDemos.map((name: string) => {
        const meta = getActivityMetadata(name);
        return {
          name,
          displayName: meta.displayName,
          type: 'core',
          category: meta.category,
          description: meta.description,
          icon: meta.icon,
          badge: meta.badge,
        };
      });

      // Deduplicate plans
      const seenPlans = new Set<string>();
      const planList: ScriptItem[] = (msg.available_activity_plans || [])
        .filter((item: any) => {
          const folder = item.folder || item.title || '';
          if (seenPlans.has(folder)) return false;
          seenPlans.add(folder);
          return true;
        })
        .map((item: any) => {
          const meta = getActivityMetadata(item.folder || item.title || '');
          return {
            name: item.folder,
            displayName: item.title && item.title !== item.folder ? item.title : meta.displayName,
            type: 'plan',
            category: 'plan',
            description: meta.description,
            icon: meta.icon || '📚',
            badge: meta.badge || 'Lesson Plan',
          };
        });

      // Deduplicate custom interactions
      const seenInteractions = new Set<string>();
      const interactionList: ScriptItem[] = (msg.available_custom_interactions || [])
        .filter((item: any) => {
          const folder = item.folder || item.title || '';
          if (seenInteractions.has(folder)) return false;
          seenInteractions.add(folder);
          return true;
        })
        .map((item: any) => {
          const meta = getActivityMetadata(item.folder || item.title || '');
          return {
            name: item.folder,
            displayName: item.title && item.title !== item.folder ? item.title : meta.displayName,
            type: 'custom',
            category: 'custom',
            description: meta.description,
            icon: meta.icon || '🎭',
            badge: meta.badge || 'Custom Interaction',
          };
        });

      const combined = [...coreList, ...planList, ...interactionList];
      setScripts(combined);
      setIsLoadingScripts(false);
      addLog(
        `Retrieved ${combined.length} activities (${coreList.length} core, ${planList.length} plans, ${interactionList.length} custom) from Gigi.`,
        'success'
      );
    } else if (msg.status === 'starting') {
      setIsRunning(true);
      setRunningScriptInfo({ name: msg.name, type: msg.type, pid: msg.pid });
      addLog(`Script "${msg.name}" started successfully (PID: ${msg.pid}).`, 'success');
    } else if (msg.status === 'stopped' || (msg.status === 'failed' && msg.event === 'completed')) {
      setIsRunning(false);
      setRunningScriptInfo(null);
      const isFailed = msg.status === 'failed' || msg.returncode !== 0;
      addLog(`Script "${msg.name}" finished. Return code: ${msg.returncode}.`, isFailed ? 'error' : 'success');
      if (msg.name && (msg.name.includes('calibrate') || msg.name === 'calibrate_motors.py')) {
        handlePing();
      }
    } else if (msg.status === 'status') {
      if (typeof msg.calibrated === 'boolean') {
        setIsRobotCalibrated(msg.calibrated);
      }
      if (typeof msg.ambient === 'boolean') {
        setIsAmbientAlive(msg.ambient);
      }
      if (msg.wifi) {
        setWifiStatus(msg.wifi);
      }
      if (msg.running) {
        setIsRunning(true);
        setRunningScriptInfo({ name: msg.name, type: msg.type, pid: msg.pid });
        addLog(`Gigi status: active running "${msg.name}" (PID: ${msg.pid})`, 'info');
      } else {
        setIsRunning(false);
        setRunningScriptInfo(null);
        if (msg.ambient) {
          addLog('Gigi status: idle in ambient alive mode (gaze & face active).', 'info');
        } else {
          addLog('Gigi status: idle, ready to execute.', 'info');
        }
      }
    } else if (msg.status === 'wifi_status') {
      setWifiStatus(msg);
      addLog(`Robot Wi-Fi: ${msg.connected ? `Connected to ${msg.ssid} (${msg.ip})` : 'Offline'}`, msg.connected ? 'success' : 'info');
    } else if (msg.status === 'wifi_scan') {
      setIsScanningWifi(false);
      setWifiNetworks(msg.networks || []);
      addLog(`Discovered ${msg.count || 0} Wi-Fi networks nearby.`, 'success');
    } else if (msg.status === 'wifi_connecting') {
      addLog(`Connecting to Wi-Fi "${msg.ssid}"...`, 'info');
    } else if (msg.status === 'wifi_connect_result') {
      setIsConnectingWifi(false);
      if (msg.success) {
        setWifiStatus({
          connected: true,
          ssid: msg.ssid,
          ip: msg.ip,
        });
        addLog(`Wi-Fi connected! SSID: ${msg.ssid}, IP: ${msg.ip}`, 'success');
        Alert.alert('Wi-Fi Connected', `Gigi joined "${msg.ssid}" successfully!\nIP: ${msg.ip}\nSSH: ssh orangepi@${msg.ip}`);
      } else {
        addLog(`Wi-Fi connection failed: ${msg.message}`, 'error');
        Alert.alert('Connection Failed', msg.message || 'Failed to connect to Wi-Fi.');
      }
    } else if (msg.status === 'wifi_hotspot_starting') {
      addLog(msg.message || 'Initializing Gigi local Wi-Fi router...', 'info');
    } else if (msg.status === 'wifi_hotspot_result') {
      setIsTogglingHotspot(false);
      if (msg.success) {
        if (msg.active) {
          setWifiStatus({
            connected: true,
            ssid: msg.ssid,
            ip: msg.ip || '10.42.0.1',
            hotspot_active: true,
            hotspot_ssid: msg.ssid,
            hotspot_ip: msg.ip || '10.42.0.1',
            hotspot_password: msg.password,
            ssh_command: msg.ssh_command,
          });
          addLog(`Gigi Wi-Fi router active! SSID: ${msg.ssid}, IP: ${msg.ip || '10.42.0.1'}`, 'success');
          Alert.alert(
            'Gigi Wi-Fi Router Active',
            `Connect to "${msg.ssid}" to access Gigi.\nPassword: ${msg.password || 'Not provided'}\nIP: ${msg.ip || '10.42.0.1'}\nSSH: ${msg.ssh_command || `ssh orangepi@${msg.ip || '10.42.0.1'}`}`
          );
        } else {
          setWifiStatus((prev) => prev ? { ...prev, hotspot_active: false, hotspot_ssid: '', hotspot_password: '' } : null);
          addLog(msg.message || 'Gigi Wi-Fi router stopped.', 'info');
        }
      } else {
        addLog(`Gigi Wi-Fi router error: ${msg.message || 'Failed to toggle Gigi Wi-Fi router.'}`, 'error');
        Alert.alert('Hotspot Error', msg.message || 'Failed to toggle Gigi Wi-Fi router.');
      }
    } else if (msg.status === 'bt_ssh_result') {
      setIsTogglingBtSsh(false);
      if (msg.success) {
        setBtSshStatus({
          enabled: Boolean(msg.enabled),
          channel: msg.channel || 2,
          bt_name: msg.bt_name,
          bt_mac: msg.bt_mac,
          ssh_command: msg.ssh_command,
          shell_cwd: msg.shell_cwd,
          shell_prompt: msg.shell_prompt,
          shell_running: msg.shell_running,
        });
        if (msg.shell_prompt) {
          setBtShellPrompt(msg.shell_prompt);
        }
        if (!msg.enabled) {
          setIsBtShellRunning(false);
        }
        addLog(
          msg.message || (msg.enabled ? 'Bluetooth SSH terminal enabled.' : 'Bluetooth SSH disabled.'),
          msg.enabled ? 'success' : 'info'
        );
      } else {
        addLog(`Bluetooth SSH error: ${msg.message || 'Failed to toggle Bluetooth SSH.'}`, 'error');
        Alert.alert('Bluetooth SSH Error', msg.message || 'Failed to toggle Bluetooth SSH.');
      }
    } else if (msg.status === 'bt_shell_started') {
      setIsBtShellRunning(true);
      if (msg.prompt) {
        setBtShellPrompt(msg.prompt);
      }
      setBtShellEntries((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.running && last.command === (msg.command || '')) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random()}`,
            prompt: msg.prompt || btShellPrompt,
            command: msg.command || '',
            output: '',
            running: true,
            timestamp: new Date().toLocaleTimeString(),
          },
        ];
      });
    } else if (msg.status === 'bt_shell_output') {
      const chunk = typeof msg.data === 'string' ? msg.data : '';
      if (chunk) {
        setBtShellEntries((prev) => {
          if (prev.length === 0) {
            return [
              {
                id: `${Date.now()}-${Math.random()}`,
                prompt: btShellPrompt,
                command: msg.command || '',
                output: chunk.replace(/\n$/, ''),
                running: true,
                timestamp: new Date().toLocaleTimeString(),
              },
            ];
          }
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          const prevOut = updated[lastIdx].output;
          const combined = prevOut ? `${prevOut}\n${chunk.replace(/\n$/, '')}` : chunk.replace(/\n$/, '');
          updated[lastIdx] = {
            ...updated[lastIdx],
            output: combined,
          };
          return updated;
        });
      }
    } else if (msg.status === 'bt_shell_result') {
      setIsBtShellRunning(false);
      if (msg.prompt) {
        setBtShellPrompt(msg.prompt);
      }
      setBtShellEntries((prev) => {
        if (prev.length === 0 || !prev[prev.length - 1].running) {
          return [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              prompt: msg.prompt || btShellPrompt,
              command: msg.command || '',
              output: typeof msg.output === 'string' ? msg.output : '',
              returncode: typeof msg.returncode === 'number' ? msg.returncode : 0,
              running: false,
              error: msg.error,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          ...updated[lastIdx],
          output: updated[lastIdx].output || (typeof msg.output === 'string' ? msg.output : ''),
          returncode: typeof msg.returncode === 'number' ? msg.returncode : 0,
          running: false,
          error: msg.error,
        };
        return updated;
      });
    } else if (msg.status === 'bt_shell_stop_result') {
      setIsBtShellRunning(false);
      if (msg.prompt) {
        setBtShellPrompt(msg.prompt);
      }
      setBtShellEntries((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx].running) {
          updated[lastIdx] = {
            ...updated[lastIdx],
            running: false,
            error: msg.message || '^C Interrupted',
          };
        }
        return updated;
      });
    } else if (msg.status === 'bt_shell_status') {
      setIsBtShellRunning(Boolean(msg.running));
      if (msg.prompt) {
        setBtShellPrompt(msg.prompt);
      }
    } else if (msg.status === 'bt_shell_input_result') {
      if (!msg.success && msg.message) {
        addLog(`Terminal input error: ${msg.message}`, 'error');
      }
    } else if (msg.status === 'sleeping') {
      setIsAmbientAlive(false);
      addLog('Gigi is now sleeping and resting motors.', 'info');
    } else if (msg.status === 'awake') {
      setIsAmbientAlive(true);
      addLog('Gigi is awake and alive!', 'success');
    } else if (msg.status === 'identifying') {
      setIsAmbientAlive(true);
      addLog(msg.message || 'Gigi is waving to identify itself!', 'success');
    } else if (msg.status === 'success' && msg.folder) {
      if (msg.folder.startsWith('custom_interaction_')) {
        setPlannedInteractionFolder(msg.folder);
        setIsSavingInteraction(false);
        addLog(`Interaction stored on robot: ${msg.folder}`, 'success');
        Alert.alert('Success', `Interaction saved successfully on robot as:\n${msg.folder}`);
      } else {
        setPlannedFolder(msg.folder);
        setIsSavingPlan(false);
        addLog(`Plan stored on robot: ${msg.folder}`, 'success');
        Alert.alert('Success', `Plan saved successfully on robot as:\n${msg.folder}`);
      }
    } else if (msg.status === 'error') {
      setIsScanningChannels(false);
      setScanProgressChannel(null);
      setIsTestingGesture(false);
      setIsSavingCalibration(false);
      addLog(`Error: ${msg.message || msg.error}`, 'error');
      setIsLoadingScripts(false);
      setIsSavingPlan(false);
      setIsSavingCalibration(false);
      setIsTestingGesture(false);
      setActiveGestureName(null);
      if (msg.requires_calibration || msg.error === 'uncalibrated') {
        setIsRobotCalibrated(false);
        Alert.alert(
          'Calibration Required',
          'The robot motors are uncalibrated! Physical movement is locked out to prevent mechanical damage. Please calibrate the motors first.'
        );
      }
    } else {
      addLog(JSON.stringify(msg), 'info');
    }
  };

  const sendRawCommand = async (command: string) => {
    if (!activeConnection.current) return;
    try {
      addLog(`Sending: "${command}"`, 'info');
      await activeConnection.current.send(command + '\n');
    } catch (e: any) {
      addLog(`Send failed: ${e.message}`, 'error');
    }
  };

  const sendJsonCommand = async (obj: any) => {
    if (!activeConnection.current) return;
    try {
      const payload = JSON.stringify(obj);
      addLog(`Sending: "${obj.command || 'json'}"`, 'info');
      await activeConnection.current.send(payload + '\n');
    } catch (e: any) {
      addLog(`Send failed: ${e.message}`, 'error');
    }
  };

  const handleScanWifi = () => {
    setIsScanningWifi(true);
    sendRawCommand('WIFI_SCAN');
  };

  const handleConnectWifi = (ssid: string, password: string) => {
    setIsConnectingWifi(true);
    sendJsonCommand({ command: 'wifi_connect', ssid, password });
  };

  const handleSleepGigi = () => {
    sendRawCommand('SLEEP');
  };

  const handleWakeGigi = () => {
    sendRawCommand('WAKE');
  };

  const handleIdentifyGigi = () => {
    sendRawCommand('IDENTIFY');
  };

  const handleStartWifiHotspot = (ssid?: string, password?: string) => {
    setIsTogglingHotspot(true);
    sendJsonCommand({ command: 'wifi_hotspot', enabled: true, ssid, password });
  };

  const handleStopWifiHotspot = () => {
    setIsTogglingHotspot(true);
    sendJsonCommand({ command: 'wifi_hotspot_stop', enabled: false });
  };

  const handleToggleBtSsh = (enabled: boolean) => {
    setIsTogglingBtSsh(true);
    sendJsonCommand({ command: 'bt_ssh', enabled });
  };

  const handleRunBtShellCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setIsBtShellRunning(true);
    setBtShellEntries((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        prompt: btShellPrompt || btSshStatus?.shell_prompt || `orangepi@${btSshStatus?.bt_name || connectedBtName || 'gigi'}:~/Code/gigi$`,
        command: trimmed,
        output: '',
        running: true,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    sendJsonCommand({ command: 'bt_shell', cmd: trimmed });
  };

  const handleSendBtShellInput = (input: string) => {
    sendJsonCommand({ command: 'bt_shell_input', input });
  };

  const handleStopBtShellCommand = () => {
    sendJsonCommand({ command: 'bt_shell_stop' });
  };

  const handleClearBtShell = () => {
    setBtShellEntries([]);
  };

  const connectToGigi = async () => {
    setConnectionError(null);
    setConnectionStatus('connecting');
    addLog(`Initiating ${connectionMode.toUpperCase()} link to Gigi...`, 'info');

    if (connectionMode === 'serial') {
      try {
        if (!(navigator as any).serial) {
          throw new Error('Web Serial API is not supported on this browser. Please use Chrome, Edge, or Opera.');
        }
        addLog('Requesting Web Serial port access...', 'info');
        const port = await (navigator as any).serial.requestPort({
          allowedBluetoothServiceClassIds: ['00001101-0000-1000-8000-00805f9b34fb'],
        });
        addLog('Opening Serial port at 115200 baud...', 'info');
        await port.open({ baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' });
        const isMac = typeof navigator !== 'undefined' && /Macintosh|Mac OS X/i.test(navigator.userAgent);
        if (!isMac) {
          try {
            await port.setSignals({ dataTerminalReady: true, requestToSend: true });
          } catch (sigErr) {
            console.warn('Failed to set serial control signals:', sigErr);
          }
        }

        const reader = port.readable.getReader();
        const decoder = new TextDecoder();

        setConnectionStatus('connected');
        addLog('Web Serial connection established successfully!', 'success');
        setIsLoadingScripts(true);

        (async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                const chunk = decoder.decode(value);
                handleIncomingData(chunk);
              }
            }
          } catch (e: any) {
            addLog(`Serial read error: ${e.message}`, 'error');
            disconnectFromGigi();
          } finally {
            try {
              reader.releaseLock();
            } catch (err) {}
          }
        })();

        const writer = port.writable.getWriter();
        const encoder = new TextEncoder();
        let writeQueue: Promise<void> = Promise.resolve();

        activeConnection.current = {
          send: async (data: string) => {
            writeQueue = writeQueue.then(async () => {
              await writer.write(encoder.encode(data));
            });
            await writeQueue;
          },
          disconnect: async () => {
            if (handshakeTimeoutRef.current) {
              clearTimeout(handshakeTimeoutRef.current);
              handshakeTimeoutRef.current = null;
            }
            if (fallbackQueryRef.current) {
              clearTimeout(fallbackQueryRef.current);
              fallbackQueryRef.current = null;
            }
            try {
              await reader.cancel();
            } catch (e) {}
            try {
              reader.releaseLock();
            } catch (e) {}
            try {
              await writer.close();
            } catch (e) {
              try {
                writer.releaseLock();
              } catch (err) {}
            }
            try {
              await port.close();
            } catch (e) {
              console.log('Error closing serial port', e);
            }
            setConnectionStatus('disconnected');
          },
        };

        if (handshakeTimeoutRef.current) clearTimeout(handshakeTimeoutRef.current);
        handshakeTimeoutRef.current = setTimeout(() => {
          addLog('Handshake timeout: No response from Gigi. Disconnecting...', 'error');
          setConnectionError('Handshake timeout. Verify robot is on, bt_listener.py is running, and Bluetooth is connected.');
          disconnectFromGigi();
        }, isMac ? 9000 : 6000);

        if (fallbackQueryRef.current) clearTimeout(fallbackQueryRef.current);
        fallbackQueryRef.current = setTimeout(() => {
          sendRawCommand('STATUS');
          sendRawCommand('LIST');
          sendRawCommand('CALIB_GET');
        }, isMac ? 2200 : 800);
      } catch (e: any) {
        setConnectionStatus('disconnected');
        const isCancelled = e.name === 'NotFoundError' || (e.message && e.message.includes('No port selected'));
        const friendlyError = isCancelled ? 'Connection cancelled: No device was selected.' : e.message;
        setConnectionError(friendlyError);
        addLog(`Web Serial link failed: ${friendlyError}`, 'error');
      }
    } else {
      if (!RNBluetoothClassic) {
        setConnectionStatus('disconnected');
        Alert.alert('Error', 'Bluetooth module is not configured.');
        return;
      }
      if (!selectedBtDevice) {
        setConnectionStatus('disconnected');
        Alert.alert('Error', 'Please select a Bluetooth device first.');
        return;
      }

      try {
        addLog(`Pairing with Bluetooth device: ${selectedBtDevice.name}...`, 'info');
        const isConnected = await RNBluetoothClassic.connectToDevice(selectedBtDevice.address);

        if (isConnected) {
          setConnectionStatus('connected');
          addLog('Bluetooth linked successfully!', 'success');

          const subscription = isConnected.onDataReceived((event: any) => {
            handleIncomingData(event.data + '\n');
          });

          btSubscription.current = subscription;
          activeConnection.current = {
            send: async (data: string) => {
              await RNBluetoothClassic.writeToDevice(selectedBtDevice.address, data);
            },
            disconnect: () => {
              if (btSubscription.current) {
                btSubscription.current.remove();
                btSubscription.current = null;
              }
              RNBluetoothClassic.disconnectFromDevice(selectedBtDevice.address);
            },
          };

          setIsLoadingScripts(true);
          setTimeout(() => {
            sendRawCommand('STATUS');
            sendRawCommand('LIST');
            sendRawCommand('CALIB_GET');
          }, 800);
        } else {
          setConnectionStatus('disconnected');
          setConnectionError('Connection refused by Gigi.');
          addLog('Bluetooth link failed.', 'error');
        }
      } catch (e: any) {
        setConnectionStatus('disconnected');
        setConnectionError(e.message);
        addLog(`Bluetooth link error: ${e.message}`, 'error');
      }
    }
  };

  const disconnectFromGigi = () => {
    if (handshakeTimeoutRef.current) {
      clearTimeout(handshakeTimeoutRef.current);
      handshakeTimeoutRef.current = null;
    }
    if (fallbackQueryRef.current) {
      clearTimeout(fallbackQueryRef.current);
      fallbackQueryRef.current = null;
    }
    if (activeConnection.current) {
      activeConnection.current.disconnect();
      activeConnection.current = null;
    }
    setConnectionStatus('disconnected');
    setConnectedBtName(null);
    setScripts([]);
    setSelectedScript(null);
    setIsRunning(false);
    setRunningScriptInfo(null);
    setIsLoadingScripts(false);
    setIsRobotCalibrated(null);
    setMotorCalibration(null);
    setCalibrationStatusInfo(null);
    setIsSavingCalibration(false);
    setIsTestingGesture(false);
    setActiveGestureName(null);
    setBtSshStatus(null);
    setIsTogglingHotspot(false);
    setIsTogglingBtSsh(false);
    addLog('Disconnected from Gigi.', 'info');
  };

  const handlePing = () => {
    setIsLoadingScripts(true);
    sendRawCommand('STATUS');
    sendRawCommand('LIST');
    sendRawCommand('CALIB_GET');
  };

  const handleFetchCalibration = () => {
    sendJsonCommand({ command: 'calib_get' });
  };

  const handleMoveChannelPwm = (channel: number, pwm: number, joint?: MotorJointName) => {
    sendJsonCommand({ command: 'calib_move', channel, pwm, joint });
  };

  const handleWiggleChannel = (channel: number, basePwm: number = 300) => {
    sendJsonCommand({ command: 'calib_wiggle', channel, pwm: basePwm, delta: 20 });
  };

  const handleScanChannels = () => {
    setIsScanningChannels(true);
    setScanProgressChannel(0);
    setChannelScanResult(null);
    sendJsonCommand({ command: 'calib_scan' });
  };

  const handleHomeMotors = (customMotors?: MotorCalibrationMap) => {
    sendJsonCommand({ command: 'calib_home', motors: customMotors });
  };

  const handleReleaseMotors = () => {
    sendJsonCommand({ command: 'calib_release' });
  };

  const handleTestGesture = (gestureName: string, customMotors?: MotorCalibrationMap) => {
    setIsTestingGesture(true);
    setActiveGestureName(gestureName);
    sendJsonCommand({ command: 'calib_test_gesture', gesture: gestureName, motors: customMotors });
  };

  const handleSaveCalibration = (motors: MotorCalibrationMap) => {
    setIsSavingCalibration(true);
    sendJsonCommand({ command: 'calib_save', motors });
  };

  const handleRunVoiceCalibrationWizard = () => {
    Alert.alert(
      'Voice Calibration Wizard',
      'Run the voice-guided motor calibration script on Gigi? Gigi will speak instructions and listen through the microphone. Please ensure the robot has physical clearance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Voice Wizard',
          onPress: () => {
            addLog('Requesting voice motor calibration wizard...', 'info');
            sendRawCommand('CALIBRATE');
          },
        },
      ]
    );
  };

  const handleCalibrateMotors = () => {
    setActiveTab('calibration');
    if (connectionStatus === 'connected') {
      handleFetchCalibration();
    }
  };

  const handleRunScript = () => {
    const scriptToRun = customScript.trim() || selectedScript;
    if (!scriptToRun) {
      Alert.alert('Error', 'Please select a script or write a name manually.');
      return;
    }
    if (isRobotCalibrated === false && scriptToRun !== 'calibrate_motors.py' && scriptToRun !== 'calibrate') {
      Alert.alert(
        'Calibration Required',
        'Robot motors are NOT calibrated! For safety and to prevent mechanical damage to servos, motor movements are locked out until calibration is performed.\n\nWould you like to run calibration now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Calibrate Now', onPress: handleCalibrateMotors },
        ]
      );
      return;
    }
    sendRawCommand(`RUN ${scriptToRun}`);
  };

  const handleStopScript = () => {
    sendRawCommand('STOP');
  };

  // Planner Methods
  const handleUpdateMeta = (key: string, value: string) => {
    setCurrentPlan((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleUpdateStep = (index: number, key: string, value: any) => {
    setCurrentPlan((prev: any) => {
      const newSteps = [...prev.steps];
      if (key === 'suggested_topics') {
        newSteps[index] = {
          ...newSteps[index],
          [key]: typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value,
        };
      } else {
        newSteps[index] = {
          ...newSteps[index],
          [key]: value,
        };
      }
      return { ...prev, steps: newSteps };
    });
  };

  const handleAddStep = () => {
    setCurrentPlan((prev: any) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          step_type: 'canned',
          sub_steps: [
            {
              text: 'Hello class!',
              facial: '[smile]',
              movement: '[wave]',
              image_filename: '',
              image_prompt: '',
              image_url: '',
            },
          ],
        },
      ],
    }));
  };

  const handleRemoveStep = (index: number) => {
    setCurrentPlan((prev: any) => ({
      ...prev,
      steps: prev.steps.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleChangeStepType = (index: number, type: 'canned' | 'open') => {
    setCurrentPlan((prev: any) => {
      const newSteps = [...prev.steps];
      if (type === 'canned') {
        newSteps[index] = {
          step_type: 'canned',
          sub_steps: [
            {
              text: 'Let us begin!',
              facial: '[smile]',
              movement: '[nod]',
              image_filename: '',
              image_prompt: '',
              image_url: '',
            },
          ],
        };
      } else {
        newSteps[index] = {
          step_type: 'open',
          goal: 'Interactive discussion with students',
          suggested_topics: ['Topic 1', 'Topic 2'],
          closing_condition: 'After 2-3 students share their ideas',
          robot_script: 'Who would like to share their thoughts?',
          image_filename: '',
          image_prompt: '',
          image_url: '',
        };
      }
      return { ...prev, steps: newSteps };
    });
  };

  const handleAddSubStep = (stepIndex: number) => {
    setCurrentPlan((prev: any) => {
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        sub_steps: [
          ...(newSteps[stepIndex].sub_steps || []),
          {
            text: 'Continuing our activity...',
            facial: '[neutral]',
            movement: '[home]',
            image_filename: '',
            image_prompt: '',
            image_url: '',
          },
        ],
      };
      return { ...prev, steps: newSteps };
    });
  };

  const handleUpdateSubStep = (stepIndex: number, subIndex: number, key: string, value: any) => {
    setCurrentPlan((prev: any) => {
      const newSteps = [...prev.steps];
      const newSubSteps = [...newSteps[stepIndex].sub_steps];
      newSubSteps[subIndex] = {
        ...newSubSteps[subIndex],
        [key]: value,
      };
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        sub_steps: newSubSteps,
      };
      return { ...prev, steps: newSteps };
    });
  };

  const handleRemoveSubStep = (stepIndex: number, subIndex: number) => {
    setCurrentPlan((prev: any) => {
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = {
        ...newSteps[stepIndex],
        sub_steps: newSteps[stepIndex].sub_steps.filter((_: any, i: number) => i !== subIndex),
      };
      return { ...prev, steps: newSteps };
    });
  };

  const getPlanImages = () => {
    if (!currentPlan) return [];
    const images: any[] = [];
    (currentPlan.steps || []).forEach((step: any, stepIndex: number) => {
      if (step.step_type === 'canned') {
        (step.sub_steps || []).forEach((subStep: any, subStepIndex: number) => {
          const facial = subStep.facial || '';
          if (facial.includes('[image:') || subStep.image_filename || subStep.image_prompt) {
            let filename = subStep.image_filename || '';
            if (!filename && facial.includes('[image:')) {
              const match = facial.match(/\[image:(.+?)\]/);
              if (match) filename = match[1];
            }
            if (filename || subStep.image_prompt) {
              images.push({
                stepIndex,
                subStepIndex,
                filename: filename || 'image.png',
                prompt: subStep.image_prompt || '',
                url: subStep.image_url || '',
                key: `step-${stepIndex}-sub-${subStepIndex}`,
              });
            }
          }
        });
      } else if (step.step_type === 'open') {
        if (step.image_filename || step.image_prompt) {
          images.push({
            stepIndex,
            filename: step.image_filename || 'image.png',
            prompt: step.image_prompt || '',
            url: step.image_url || '',
            key: `step-${stepIndex}`,
          });
        }
      }
    });
    return images;
  };

  const generateImageFor = async (imageKey: { stepIndex: number; subStepIndex?: number; prompt: string; filename: string }) => {
    const { stepIndex, subStepIndex, prompt, filename } = imageKey;
    const uniqueKey = subStepIndex !== undefined ? `step-${stepIndex}-sub-${subStepIndex}` : `step-${stepIndex}`;
    if (generatingImages[uniqueKey]) return;

    setGeneratingImages((prev) => ({ ...prev, [uniqueKey]: true }));
    addLog(`DALL-E request queued for image: "${filename}" (${selectedImageSize})`, 'info');

    try {
      const isGptImage = AZURE_OPENAI_CONFIG.dalleDeploymentName.includes('gpt-image');
      const apiVersion = isGptImage
        ? AZURE_OPENAI_CONFIG.apiVersion || '2025-04-01-preview'
        : '2024-02-01';
      const imageSize = isGptImage && selectedImageSize !== '1024x1024'
        ? '1024x1024'
        : selectedImageSize;
      const endpoint = `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.dalleDeploymentName}/images/generations?api-version=${apiVersion}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': decryptedApiKey || (AZURE_OPENAI_CONFIG as any).apiKey || '',
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: imageSize,
          ...(!isGptImage ? { response_format: 'b64_json' } : {}),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DALL-E HTTP ${response.status}: ${errorText}`);
      }

      const resData = await response.json();
      const b64 = resData.data[0].b64_json;
      const dataUri = `data:image/png;base64,${b64}`;

      imageBase64Cache.current[filename] = b64;

      setCurrentPlan((prev: any) => {
        const newSteps = [...prev.steps];
        if (subStepIndex !== undefined) {
          const subSteps = [...newSteps[stepIndex].sub_steps];
          subSteps[subStepIndex] = {
            ...subSteps[subStepIndex],
            image_url: dataUri,
          };
          newSteps[stepIndex] = { ...newSteps[stepIndex], sub_steps: subSteps };
        } else {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            image_url: dataUri,
          };
        }
        return { ...prev, steps: newSteps };
      });
      addLog(`Image generated successfully: "${filename}"`, 'success');
    } catch (err: any) {
      addLog(`Image generation failed: ${err.message}`, 'error');
      Alert.alert('Image Error', err.message);
    } finally {
      setGeneratingImages((prev) => ({ ...prev, [uniqueKey]: false }));
    }
  };

  const generateAllImages = async () => {
    const images = getPlanImages().filter((img) => !img.url);
    if (images.length === 0) {
      Alert.alert('Done', 'All images have already been generated!');
      return;
    }
    setIsGeneratingAll(true);
    for (const img of images) {
      await generateImageFor(img);
    }
    setIsGeneratingAll(false);
  };

  const generateActivityPlan = async () => {
    if (!activityPrompt.trim()) {
      Alert.alert('Empty Description', 'Please provide a description of the classroom activity.');
      return;
    }
    setIsGeneratingPlan(true);
    addLog(`Synthesizing classroom activity: "${activityPrompt.substring(0, 40)}..."`, 'info');

    try {
      const systemPrompt = `You are an expert pedagogy and robotics activity designer for "Gigi", a social educational robot.
Generate a structured classroom activity plan based on the teacher's request.
Return strictly valid JSON conforming to this structure:
{
  "activity_title": "String",
  "topic": "String",
  "grade_level": "String",
  "target_audience": "String",
  "learning_goals": ["Goal 1", "Goal 2"],
  "approximate_duration": "String",
  "number_of_students": "String",
  "steps": [
    {
      "step_type": "canned",
      "sub_steps": [
        {
          "text": "Exact words Gigi should speak.",
          "facial": "[smile]",
          "movement": "[wave]",
          "image_filename": "",
          "image_prompt": "",
          "image_url": ""
        }
      ]
    },
    {
      "step_type": "open",
      "goal": "Interactive goal description",
      "suggested_topics": ["Topic 1", "Topic 2"],
      "closing_condition": "Explicit condition to advance",
      "robot_script": "Initial words Gigi speaks.",
      "image_filename": "",
      "image_prompt": "",
      "image_url": ""
    }
  ]
}`;

      const response = await fetch(
        `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.deploymentName}/chat/completions?api-version=${AZURE_OPENAI_CONFIG.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': decryptedApiKey || (AZURE_OPENAI_CONFIG as any).apiKey || '',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Activity Description: ${activityPrompt}` },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const parsedPlan = JSON.parse(responseData.choices[0].message.content);
      parsedPlan.target_audience = parsedPlan.target_audience || parsedPlan.grade_level || '';
      imageBase64Cache.current = {};
      setCurrentPlan(parsedPlan);
      setPlannedFolder(null);
      addLog(`Plan generated successfully: "${parsedPlan.activity_title}"`, 'success');
    } catch (err: any) {
      addLog(`LLM Synthesis failed: ${err.message}`, 'error');
      Alert.alert('Synthesis Error', err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const savePlanToRobot = async () => {
    if (!currentPlan) {
      Alert.alert('No Plan', 'Please generate or load an activity plan first.');
      return;
    }
    if (connectionStatus !== 'connected' || !activeConnection.current) {
      Alert.alert('Disconnected', 'Please connect to Gigi before saving the plan.');
      return;
    }

    setIsSavingPlan(true);
    addLog(`Deploying plan: "${currentPlan.activity_title}" to Gigi...`, 'info');

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
      const sanitizedTitle = currentPlan.activity_title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 30);
      const folderName = `activity_plan_${timestamp}_${sanitizedTitle}`;

      const cleanedPlanSteps = (currentPlan.steps || []).map((step: any) => {
        const stepCopy = { ...step };
        if (stepCopy.step_type === 'canned') {
          stepCopy.sub_steps = (stepCopy.sub_steps || []).map((subStep: any) => {
            const subStepCopy = { ...subStep };
            delete subStepCopy.image_base64;
            return subStepCopy;
          });
        } else if (stepCopy.step_type === 'open') {
          delete stepCopy.image_base64;
        }
        return stepCopy;
      });

      const cleanedPlan = { ...currentPlan, steps: cleanedPlanSteps };
      const imagesDict = imageBase64Cache.current;

      const saveCommandObj = {
        command: 'save_plan',
        name: folderName,
        plan: cleanedPlan,
        images: imagesDict,
      };

      const payload = JSON.stringify(saveCommandObj);
      await activeConnection.current.send(payload + '\n');
      addLog(`Plan payload dispatched (${Math.round(payload.length / 1024)} KB). Waiting for confirmation...`, 'info');
    } catch (e: any) {
      setIsSavingPlan(false);
      addLog(`Deployment failed: ${e.message}`, 'error');
      Alert.alert('Error', `Failed to send plan: ${e.message}`);
    }
  };

  const runActivityPlan = () => {
    if (!plannedFolder) {
      Alert.alert('Save Required', 'Please save the plan to Gigi before running.');
      return;
    }
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
    sendRawCommand(`RUN ${plannedFolder}`);
  };

  // Interaction Designer Methods
  const generateCustomInteraction = async () => {
    if (!interactionPrompt.trim()) {
      Alert.alert('Empty Input', 'Please describe the interaction or game logic.');
      return;
    }
    setIsGeneratingInteraction(true);
    addLog(`Synthesizing custom interaction: "${interactionPrompt.substring(0, 40)}..."`, 'info');

    try {
      const systemPrompt = `You are an expert conversational interaction designer for the Gigi humanoid robot.
Conform strictly to JSON state machine specification:
{
  "interaction_title": "String",
  "description": "String",
  "initial_state": "String",
  "variables": { "key": "value" },
  "states": {
    "state_name": {
      "actions": [
        { "type": "say", "text": "Speech", "movement": "nod", "facial": "smile" },
        { "type": "listen", "variable": "var_name" }
      ],
      "transitions": [
        { "condition": "Python condition", "target": "next_state" },
        { "target": "fallback_state" }
      ]
    }
  }
}`;

      const response = await fetch(
        `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.deploymentName}/chat/completions?api-version=${AZURE_OPENAI_CONFIG.apiVersion}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': decryptedApiKey || (AZURE_OPENAI_CONFIG as any).apiKey || '',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: interactionPrompt },
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const parsedJson = JSON.parse(result.choices[0].message.content);
      setCurrentInteraction(parsedJson);
      setPlannedInteractionFolder(null);
      addLog(`Synthesized dynamic interaction: "${parsedJson.interaction_title}" successfully!`, 'success');
    } catch (err: any) {
      addLog(`Synthesis failed: ${err.message}`, 'error');
      Alert.alert('Synthesis Error', err.message);
    } finally {
      setIsGeneratingInteraction(false);
    }
  };

  const saveInteractionToRobot = async () => {
    if (!currentInteraction) {
      Alert.alert('No Interaction', 'Please generate or load an interaction first.');
      return;
    }
    if (connectionStatus !== 'connected' || !activeConnection.current) {
      Alert.alert('Disconnected', 'Please connect to Gigi before saving.');
      return;
    }

    setIsSavingInteraction(true);
    addLog(`Saving interaction: "${currentInteraction.interaction_title || 'Untitled'}" to Gigi...`, 'info');

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
      const sanitizedTitle = (currentInteraction.interaction_title || 'interaction')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 30);
      const folderName = `custom_interaction_${timestamp}_${sanitizedTitle}`;

      const payload = JSON.stringify({
        command: 'save_custom_interaction',
        name: folderName,
        interaction: currentInteraction,
      });

      await activeConnection.current.send(payload + '\n');
      addLog(`Interaction dispatched to robot as "${folderName}".`, 'info');
    } catch (e: any) {
      setIsSavingInteraction(false);
      addLog(`Save failed: ${e.message}`, 'error');
      Alert.alert('Error', `Failed to save interaction: ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* HUD Bar */}
      <View style={styles.hudBar}>
        <View style={styles.hudTitleContainer}>
          <Text style={styles.hudTitle}>🤖 Gigi Classroom Assistant</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            <Text style={[styles.hudSubTitle, { marginTop: 0 }]}>Your Interactive Learning Portal</Text>
            {isAuthenticated ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {loggedInUser ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: '#5E43F3',
                      fontWeight: '700',
                      backgroundColor: '#F3F0FC',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#D1CCE6',
                    }}
                  >
                    👤 {loggedInUser}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={{
                    backgroundColor: '#FFEBEF',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: '#FFCCD6',
                  }}
                  accessibilityRole="button"
                  focusable={true}
                  accessibilityLabel="Log out and clear saved credentials"
                >
                  <Text style={{ color: '#DE350B', fontSize: 11, fontWeight: '700' }}>🚪 Log Out</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Glowing Status Dot & Calibration Indicator */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={[
              styles.statusBadge,
              connectionStatus === 'connected'
                ? styles.statusBadgeConnected
                : connectionStatus === 'connecting'
                ? styles.statusBadgeConnecting
                : styles.statusBadgeDisconnected,
            ]}
          >
            <Animated.View
              style={[
                styles.statusDot,
                connectionStatus === 'connected'
                  ? styles.statusDotConnected
                  : connectionStatus === 'connecting'
                  ? styles.statusDotConnecting
                  : styles.statusDotDisconnected,
                { opacity: pulseAnim },
              ]}
            />
            <Text
              style={[
                styles.statusLabel,
                connectionStatus === 'connected'
                  ? styles.statusLabelConnected
                  : connectionStatus === 'connecting'
                  ? styles.statusLabelConnecting
                  : styles.statusLabelDisconnected,
              ]}
            >
              {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus === 'connecting' ? 'LINKING' : 'OFFLINE'}
            </Text>
          </View>

          {connectionStatus === 'connected' && (
            <TouchableOpacity
              style={[
                styles.statusBadge,
                isRobotCalibrated === true ? styles.statusBadgeCalibrated : styles.statusBadgeUncalibrated,
              ]}
              onPress={handleCalibrateMotors}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                isRobotCalibrated === true
                  ? 'Motors calibrated. Tap to open Motor Calibration Studio.'
                  : 'Motors uncalibrated. Tap to open Motor Calibration Studio.'
              }
            >
              <Text
                style={[
                  styles.statusLabel,
                  isRobotCalibrated === true ? styles.statusLabelCalibrated : styles.statusLabelUncalibrated,
                ]}
              >
                {isRobotCalibrated === true ? '🟢 CALIBRATED' : isRobotCalibrated === false ? '⚠️ UNCALIBRATED' : '⚪ CHECKING'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'console' && styles.tabButtonActive]}
          onPress={() => setActiveTab('console')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          focusable={true}
          accessibilityLabel="Console view tab"
          accessibilityState={{ selected: activeTab === 'console' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'console' && styles.tabButtonTextActive]}>
            Chat & Manual Control
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'activities' && styles.tabButtonActive]}
          onPress={() => setActiveTab('activities')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          focusable={true}
          accessibilityLabel="Robot Activities tab"
          accessibilityState={{ selected: activeTab === 'activities' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'activities' && styles.tabButtonTextActive]}>
            Robot Activities
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'calibration' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('calibration');
            if (connectionStatus === 'connected' && !motorCalibration) {
              handleFetchCalibration();
            }
          }}
          activeOpacity={0.8}
          accessibilityRole="tab"
          focusable={true}
          accessibilityLabel="Motor Calibration Studio tab"
          accessibilityState={{ selected: activeTab === 'calibration' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'calibration' && styles.tabButtonTextActive]}>
            {isRobotCalibrated === false ? '⚠️ Motor Calibration' : '🦾 Motor Calibration'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'planner' && styles.tabButtonActive]}
          onPress={() => setActiveTab('planner')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          focusable={true}
          accessibilityLabel="Lesson Planner tab"
          accessibilityState={{ selected: activeTab === 'planner' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'planner' && styles.tabButtonTextActive]}>
            Lesson Planner
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'interaction' && styles.tabButtonActive]}
          onPress={() => setActiveTab('interaction')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          focusable={true}
          accessibilityLabel="Interaction Designer tab"
          accessibilityState={{ selected: activeTab === 'interaction' }}
        >
          <Text style={[styles.tabButtonText, activeTab === 'interaction' && styles.tabButtonTextActive]}>
            Interaction Designer
          </Text>
        </TouchableOpacity>
        {userRole === 'admin' && (
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'manager' && styles.tabButtonActive]}
            onPress={() => setActiveTab('manager')}
            activeOpacity={0.8}
            accessibilityRole="tab"
            focusable={true}
            accessibilityLabel="User access management tab"
            accessibilityState={{ selected: activeTab === 'manager' }}
          >
            <Text style={[styles.tabButtonText, activeTab === 'manager' && styles.tabButtonTextActive]}>
              Manager Panel
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Views */}
      {activeTab === 'console' ? (
        <ConsoleView
          connectionMode={connectionMode}
          isMobileBrowser={isMobileBrowser}
          connectionStatus={connectionStatus}
          connectionError={connectionError}
          selectedBtDevice={selectedBtDevice}
          setSelectedBtDevice={setSelectedBtDevice}
          sortedBtDevices={sortedBtDevices}
          connectToGigi={connectToGigi}
          disconnectFromGigi={disconnectFromGigi}
          logFilter={logFilter}
          setLogFilter={setLogFilter}
          handleClearLogs={handleClearLogs}
          filteredLogs={filteredLogs}
          logsScrollViewRef={logsScrollViewRef}
          wifiStatus={wifiStatus}
          wifiNetworks={wifiNetworks}
          isScanningWifi={isScanningWifi}
          isConnectingWifi={isConnectingWifi}
          btSshStatus={btSshStatus}
          isTogglingHotspot={isTogglingHotspot}
          isTogglingBtSsh={isTogglingBtSsh}
          onScanWifi={handleScanWifi}
          onConnectWifi={handleConnectWifi}
          onStartWifiHotspot={handleStartWifiHotspot}
          onStopWifiHotspot={handleStopWifiHotspot}
          onToggleBtSsh={handleToggleBtSsh}
          btShellEntries={btShellEntries}
          btShellPrompt={btShellPrompt}
          isBtShellRunning={isBtShellRunning}
          onRunBtShellCommand={handleRunBtShellCommand}
          onSendBtShellInput={handleSendBtShellInput}
          onStopBtShellCommand={handleStopBtShellCommand}
          onClearBtShell={handleClearBtShell}
          onSleepGigi={handleSleepGigi}
          onWakeGigi={handleWakeGigi}
          onIdentifyGigi={handleIdentifyGigi}
          connectedBtName={connectedBtName}
          isAmbientAlive={isAmbientAlive}
        />
      ) : activeTab === 'activities' ? (
        <ActivitiesView
          connectionStatus={connectionStatus}
          handlePing={handlePing}
          isLoadingScripts={isLoadingScripts}
          isRobotCalibrated={isRobotCalibrated}
          handleCalibrateMotors={handleCalibrateMotors}
          scripts={scripts}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          subCategoryFilter={subCategoryFilter}
          setSubCategoryFilter={setSubCategoryFilter}
          selectedScript={selectedScript}
          setSelectedScript={setSelectedScript}
          isRunning={isRunning}
          runningScriptInfo={runningScriptInfo}
          handleRunScript={handleRunScript}
          handleStopScript={handleStopScript}
        />
      ) : activeTab === 'calibration' ? (
        <MotorCalibrationView
          connectionStatus={connectionStatus}
          isRobotCalibrated={isRobotCalibrated}
          calibrationStatusInfo={calibrationStatusInfo}
          motorCalibration={motorCalibration}
          isSavingCalibration={isSavingCalibration}
          isTestingGesture={isTestingGesture}
          activeGestureName={activeGestureName}
          isScanningChannels={isScanningChannels}
          scanProgressChannel={scanProgressChannel}
          channelScanResult={channelScanResult}
          onFetchCalibration={handleFetchCalibration}
          onMoveChannelPwm={handleMoveChannelPwm}
          onWiggleChannel={handleWiggleChannel}
          onScanChannels={handleScanChannels}
          onHomeMotors={handleHomeMotors}
          onReleaseMotors={handleReleaseMotors}
          onTestGesture={handleTestGesture}
          onSaveCalibration={handleSaveCalibration}
          onRunVoiceCalibrationWizard={handleRunVoiceCalibrationWizard}
        />
      ) : activeTab === 'planner' ? (
        <PlannerView
          activityPrompt={activityPrompt}
          setActivityPrompt={setActivityPrompt}
          isGeneratingPlan={isGeneratingPlan}
          generateActivityPlan={generateActivityPlan}
          currentPlan={currentPlan}
          handleUpdateMeta={handleUpdateMeta}
          handleChangeStepType={handleChangeStepType}
          handleRemoveSubStep={handleRemoveSubStep}
          handleUpdateSubStep={handleUpdateSubStep}
          handleAddSubStep={handleAddSubStep}
          handleUpdateStep={handleUpdateStep}
          handleRemoveStep={handleRemoveStep}
          handleAddStep={handleAddStep}
          getPlanImages={getPlanImages}
          selectedImageSize={selectedImageSize}
          setSelectedImageSize={setSelectedImageSize}
          generatingImages={generatingImages}
          generateImageFor={generateImageFor}
          isGeneratingAll={isGeneratingAll}
          generateAllImages={generateAllImages}
          isSavingPlan={isSavingPlan}
          savePlanToRobot={savePlanToRobot}
          plannedFolder={plannedFolder}
          runActivityPlan={runActivityPlan}
        />
      ) : activeTab === 'interaction' ? (
        <InteractionView
          interactionPrompt={interactionPrompt}
          setInteractionPrompt={setInteractionPrompt}
          isGeneratingInteraction={isGeneratingInteraction}
          generateCustomInteraction={generateCustomInteraction}
          currentInteraction={currentInteraction}
          setCurrentInteraction={setCurrentInteraction}
          isSavingInteraction={isSavingInteraction}
          saveInteractionToRobot={saveInteractionToRobot}
          plannedInteractionFolder={plannedInteractionFolder}
          connectionStatus={connectionStatus}
          isRobotCalibrated={isRobotCalibrated}
          handleCalibrateMotors={handleCalibrateMotors}
          sendRawCommand={sendRawCommand}
        />
      ) : (
        <ManagerView
          adminApiKey={adminApiKey}
          handleSaveAdminApiKey={handleSaveAdminApiKey}
          setDecryptedApiKey={setDecryptedApiKey}
          newUserName={newUserName}
          setNewUserName={setNewUserName}
          newUserExpiration={newUserExpiration}
          setNewUserExpiration={setNewUserExpiration}
          generatedToken={generatedToken}
          generateUserToken={generateUserToken}
          issuedTokens={issuedTokens}
          blacklist={blacklist}
          handleToggleBlacklist={handleToggleBlacklist}
          copyToClipboard={copyToClipboard}
          activeQrUser={activeQrUser}
          setActiveQrUser={setActiveQrUser}
          exportBackup={exportBackup}
          importBackup={importBackup}
        />
      )}
    </View>
  );
}
