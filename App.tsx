import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
  Animated,
  NativeModules,
  Image,
  Clipboard,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import TcpSocket from 'react-native-tcp-socket';
import { AZURE_OPENAI_CONFIG } from './config.local';
import { sha256, decrypt, encrypt } from './web/mocks/sha256';

// Conditional import for Bluetooth Classic
let RNBluetoothClassic: any = null;
try {
  RNBluetoothClassic = require('react-native-bluetooth-classic').default;
} catch {
  console.log('Bluetooth classic library not linked natively yet.');
}

const PermissionsAndroid = Platform.OS === 'android' ? require('react-native').PermissionsAndroid : null;

const { FileSaver } = NativeModules;

interface ScriptItem {
  name: string;
  type: 'demo' | 'script' | 'zhennan';
  displayName?: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'output' | 'raw';
}

const STRATEGY_CATALOG_STR = `Strategy Catalog:
- ID: express_enthusiasm_for_learning
  Name: Express Positive Attitude and Enthusiasm
  Trigger: When the robot is introducing examples or demonstrating the task.
  Target Skills: Creativity, Curiosity, Exploration
  Actions: Show interest in learning, exploring, and creating; foster a positive emotional atmosphere.
  Non-Verbal Options: [nod], [smile], [curious face]

- ID: explain_intent_behind_choice
  Name: Explain Intent Behind the Choice
  Trigger: When the robot selects an option/answer/example during the activity.
  Target Skills: Growth Mindset
  Actions: Explain the reason behind the choice and highlight the learning intent.

- ID: model_positive_target_skills
  Name: Demonstrate Positive Behaviors for Target Skills
  Trigger: When the robot is demonstrating how to engage in the task (e.g., storytelling/creation).
  Target Skills: Creativity
  Actions: Provide creative ideas and model how they are generated; offer novel themes.

- ID: model_positive_self_belief
  Name: Demonstrate Positive Self-Belief
  Trigger: When the robot faces challenges during the task.
  Target Skills: Growth Mindset
  Actions: Model persistence and positive self-talk when something is difficult.

- ID: normalize_failure_as_learning
  Name: Model a Safe Space for Failure and Creative Expression
  Trigger: When the robot makes a mistake or has failed attempts.
  Target Skills: Growth Mindset, Creativity
  Actions: Express a positive attitude toward failure, stay enthusiastic, and emphasize learning and improvement.

- ID: celebrate_effortful_success
  Name: Reinforce Accomplishment After Effort
  Trigger: When the robot succeeds after effort.
  Target Skills: Growth Mindset
  Actions: Express accomplishment and reinforce that hard work is valuable.

- ID: suggest_divergent_ideas
  Name: Demonstrate Divergent Thinking by Suggesting New Ideas
  Trigger: When children are exploring the task and building a story/project.
  Target Skills: Creativity
  Actions: Occasionally suggest an idea that diverges from the current narrative or introduces a new character/theme.

- ID: model_curiosity_imaginative_questioning
  Name: Demonstrate Curiosity Through Imaginative Questioning
  Trigger: When children are exploring the task or when a new scene begins.
  Target Skills: Curiosity
  Actions: Ask imaginative questions and anticipate future events to encourage wonder and exploration.

- ID: active_listening_nodding
  Name: Express Active Listening with Nonverbal Cues
  Trigger: When children are speaking.
  Target Skills: Public Speech
  Actions: Use active listening behaviors (e.g., head nodding) to show attention and engagement.
`;

export default function App() {
  // Authentication State
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

    // 1. Admin login via master passcode
    if (trimmed === 'gigi2026') {
      let adminKey = '';
      try {
        if (typeof localStorage !== 'undefined') {
          adminKey = localStorage.getItem('gigi_admin_api_key') || '';
        }
      } catch {}
      if (!adminKey) {
        try {
          adminKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
        } catch {}
      }
      
      setDecryptedApiKey(adminKey);
      setUserRole('admin');
      setLoggedInUser('Admin');
      setIsAuthenticated(true);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('gigi_passcode', 'gigi2026');
        }
      } catch {}
      return;
    }

    // 2. Token-based login for users (encrypted hex or Mrs_Smith|2026-12-31|signature)
    let decryptedToken = trimmed;
    if (!trimmed.includes('|') && trimmed !== 'gigi2026') {
      try {
        decryptedToken = decrypt(trimmed, 'gigi-token-salt-2026');
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
      const expectedSig = sha256(username + '|' + expiration + '|' + apiKey + '|gigi-token-salt-2026').substring(0, 16);
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
      const expectedSig = sha256(username + '|' + expiration + '|gigi-token-salt-2026');
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
          const derivedKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
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
  };;

  useEffect(() => {
    // Check if key query parameter is present in URL
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const keyParam = urlParams.get('key');
        if (keyParam) {
          // Clean the URL bar so they don't see the raw key or re-trigger on refresh
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
          if (trimmed === 'gigi2026') {
            let adminKey = localStorage.getItem('gigi_admin_api_key') || '';
            if (!adminKey) {
              try {
                adminKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
              } catch {}
            }
            setDecryptedApiKey(adminKey);
            setUserRole('admin');
            setLoggedInUser('Admin');
            setIsAuthenticated(true);
          } else {
            let decryptedToken = trimmed;
            if (!trimmed.includes('|')) {
              try {
                decryptedToken = decrypt(trimmed, 'gigi-token-salt-2026');
              } catch {}
            }
            const parts = decryptedToken.split('|');
            if (parts.length === 4) {
              const [username, expiration, apiKey, signature] = parts;
              const expectedSig = sha256(username + '|' + expiration + '|' + apiKey + '|gigi-token-salt-2026').substring(0, 16);
              if (signature === expectedSig) {
                const expDate = new Date(expiration);
                const now = new Date();
                let curBlacklist: string[] = [];
                try {
                  const stored = localStorage.getItem('gigi_blacklist');
                  if (stored) {
                    curBlacklist = JSON.parse(stored);
                  }
                } catch {}

                if (expDate >= now && !curBlacklist.includes(username.toLowerCase())) {
                  setDecryptedApiKey(apiKey);
                  setUserRole('user');
                  setLoggedInUser(username.replace('_', ' '));
                  setIsAuthenticated(true);
                }
              }
            } else if (parts.length === 3) {
              const [username, expiration, signature] = parts;
              const expectedSig = sha256(username + '|' + expiration + '|gigi-token-salt-2026');
              if (signature === expectedSig) {
                const expDate = new Date(expiration);
                const now = new Date();
                let curBlacklist: string[] = [];
                try {
                  const stored = localStorage.getItem('gigi_blacklist');
                  if (stored) {
                    curBlacklist = JSON.parse(stored);
                  }
                } catch {}

                if (expDate >= now && !curBlacklist.includes(username.toLowerCase())) {
                  try {
                    const derivedKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
                    setDecryptedApiKey(derivedKey);
                    setUserRole('user');
                    setLoggedInUser(username.replace('_', ' '));
                    setIsAuthenticated(true);
                  } catch {}
                }
              }
            }
          }
        }
      }
    } catch {}
  }, []);

  if (!isAuthenticated) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.authContainer}>
          <View style={styles.authCard}>
            <Text style={styles.authEmoji}></Text>
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

            <TouchableOpacity style={styles.authBtn} onPress={handleAuthenticate} activeOpacity={0.85} accessibilityRole="button" focusable={true} accessibilityLabel="Unlock System button">
              <Text style={styles.authBtnText}>UNLOCK SYSTEM</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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

interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

const QRCodeDisplay = ({ value, size = 150 }: QRCodeDisplayProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    import('qrcode')
      .then((QRCode) => {
        QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
          .then((url) => {
            if (active) setQrDataUrl(url);
          })
          .catch((err) => {
            console.error('Failed to generate QR code:', err);
          });
      })
      .catch((err) => {
        console.error('Failed to load qrcode library:', err);
      });
    return () => {
      active = false;
    };
  }, [value, size]);

  if (!qrDataUrl) {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F3F8', borderRadius: 8 }}>
        <ActivityIndicator size="small" color="#5E43F3" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: qrDataUrl }}
      style={{ width: size, height: size, borderRadius: 8 }}
      resizeMode="contain"
    />
  );
};

interface IssuedToken {
  username: string;
  token: string;
  expiration: string;
  generationCount: number;
  createdAt: string;
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
  handleLogout
}: AppContentProps) {
  // Tab Navigation State
  const [activeTab, setActiveTab] = useState<'console' | 'planner' | 'interaction' | 'manager'>('console');

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
            const configKey = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
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
        apiKeyToEmbed = decrypt((AZURE_OPENAI_CONFIG as any).encryptedApiKey, 'gigi2026');
      } catch {}
    }

    if (!apiKeyToEmbed) {
      Alert.alert('Error', 'Azure OpenAI API Key is missing. Please save the API Key in the settings below first.');
      return;
    }

    const signature = sha256(name + '|' + newUserExpiration + '|' + apiKeyToEmbed + '|gigi-token-salt-2026').substring(0, 16);
    const rawToken = `${name}|${newUserExpiration}|${apiKeyToEmbed}|${signature}`;
    const token = encrypt(rawToken, 'gigi-token-salt-2026');
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
          createdAt: new Date().toISOString().split('T')[0]
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
      navigator.clipboard.writeText(text).then(() => {
        Alert.alert('Copied', 'Token copied to clipboard.');
      }).catch(() => {
        Alert.alert('Copy Failed', 'Please select and copy the token manually.');
      });
      return;
    }
    try {
      Clipboard.setString(text);
      Alert.alert('Copied', 'Token copied to clipboard.');
    } catch {
      Alert.alert('Copy Failed', 'Please select and copy the token manually.');
    }
  };

  const renderManagerPanel = () => {
    return (
      <View style={{ gap: 18 }}>
        {/* Azure API Key Configuration Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#FF9900' }]} />
          <Text style={styles.cardSectionTitle}> Azure OpenAI API Key Settings</Text>
          <Text style={{ color: '#706B8E', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
             Configure the Azure OpenAI API key. This key will be securely embedded inside new user tokens and saved locally in your browser.
          </Text>

          <View style={{ marginTop: 12, marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Azure API Key</Text>
            <TextInput
              style={styles.input}
              value={adminApiKey}
              onChangeText={(val) => {
                handleSaveAdminApiKey(val);
                if (typeof setDecryptedApiKey !== 'undefined') {
                  setDecryptedApiKey(val);
                }
              }}
              placeholder="Enter Azure OpenAI API Key"
              placeholderTextColor="#8F8AA9"
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!adminApiKey && (
              <Text style={{ color: '#DE350B', fontSize: 12, marginTop: 6, fontWeight: '600' }}>
                ⚠️ API Key is currently not set! Users will not be able to generate plans or tokens.
              </Text>
            )}
          </View>
        </View>

        {/* Issue Token Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
          <Text style={styles.cardSectionTitle}> Issue New User Token</Text>
          <Text style={{ color: '#706B8E', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
             Generate custom signed access keys for users. A signed key lets them use the robot and your Azure key safely.
          </Text>

          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>User Name / Class ID</Text>
            <TextInput
              style={styles.input}
              value={newUserName}
              onChangeText={setNewUserName}
              placeholder="e.g. mrs_smith"
              placeholderTextColor="#8F8AA9"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={{ marginBottom: 16 }}>
            <Text style={styles.inputLabel}>Expiration Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={newUserExpiration}
              onChangeText={setNewUserExpiration}
              placeholder="2026-12-31"
              placeholderTextColor="#8F8AA9"
            />
          </View>

          <TouchableOpacity style={styles.connectButton} onPress={generateUserToken} activeOpacity={0.85}>
            <Text style={styles.buttonText}>GENERATE USER KEY</Text>
          </TouchableOpacity>

          {generatedToken ? (
            <View style={{ marginTop: 16, backgroundColor: '#F4F3F8', borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: '#E2DFF0', gap: 10 }}>
              <Text style={[styles.inputLabel, { fontSize: 13 }]}>Generated Token (Copy and send to user):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#FFFFFF', fontSize: 13, minHeight: 45, color: '#5E43F3', fontWeight: '600' }]}
                value={generatedToken}
                editable={false}
                selectTextOnFocus={true}
              />
              {(() => {
                const currentOrigin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://gogordon-iu.github.io/gigi-app/';
                const fullUrl = `${currentOrigin}?key=${generatedToken}`;
                return (
                  <View style={{ alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2DFF0' }}>
                    <QRCodeDisplay value={fullUrl} size={160} />
                    <Text style={{ fontSize: 11, color: '#706B8E', marginTop: 8, textAlign: 'center' }}>
                      Scan this QR code with a phone to log in instantly.
                    </Text>
                  </View>
                );
              })()}
            </View>
          ) : null}
        </View>

        {/* Issued Tokens & Usage List */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#00FF66' }]} />
          <Text style={styles.cardSectionTitle}> Active Users & Usage Logs</Text>
          <Text style={{ color: '#706B8E', fontSize: 14, marginTop: 6, marginBottom: 12, lineHeight: 20 }}>
             Track how many times each user has generated a Lesson Plan. Revoke access directly below.
          </Text>
          
          {issuedTokens.length > 0 ? (
            <View style={{ gap: 12 }}>
              {issuedTokens.map((item) => {
                const isRevoked = blacklist.includes(item.username);
                return (
                  <View key={item.username} style={{ backgroundColor: '#F9F8FD', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: isRevoked ? '#FFCCD6' : '#ECE9F5', gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontWeight: '700', fontSize: 14, color: isRevoked ? '#DE350B' : '#1A153B' }}>
                           {item.username.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </Text>
                        {isRevoked && (
                          <Text style={{ fontSize: 10, color: '#DE350B', fontWeight: '700', backgroundColor: '#FFEBEF', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: '#FFCCD6' }}>
                            REVOKED
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleToggleBlacklist(item.username)}
                        style={{ backgroundColor: isRevoked ? '#E6FFF0' : '#FFEBEF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: isRevoked ? '#00E676' : '#FFCCD6' }}
                      >
                        <Text style={{ color: isRevoked ? '#00C853' : '#DE350B', fontSize: 11, fontWeight: '700' }}>
                          {isRevoked ? 'Restore Access' : 'Revoke Access'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ color: '#706B8E', fontSize: 12 }}>
                        Issued: <Text style={{ color: '#3A355A', fontWeight: '600' }}>{item.createdAt}</Text> | Exp: <Text style={{ color: '#3A355A', fontWeight: '600' }}>{item.expiration}</Text>
                      </Text>
                      <Text style={{ color: '#5E43F3', fontSize: 12, fontWeight: '700', backgroundColor: '#F3F0FC', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                         {item.generationCount || 0} generations
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ECE9F5' }}>
                      <TextInput
                        style={{ flex: 1, fontSize: 11, color: '#48446B', fontFamily: 'monospace', padding: 0 }}
                        value={item.token}
                        editable={false}
                        selectTextOnFocus={true}
                      />
                      <TouchableOpacity
                        style={{ backgroundColor: '#F4F3F8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#D1CCE6' }}
                        onPress={() => copyToClipboard(item.token)}
                      >
                        <Text style={{ fontSize: 10, color: '#5E43F3', fontWeight: '700' }}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: activeQrUser === item.username ? '#5E43F3' : '#F4F3F8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: activeQrUser === item.username ? '#5E43F3' : '#D1CCE6' }}
                        onPress={() => setActiveQrUser(activeQrUser === item.username ? null : item.username)}
                      >
                        <Text style={{ fontSize: 10, color: activeQrUser === item.username ? '#FFFFFF' : '#5E43F3', fontWeight: '700' }}>
                          QR Code
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {activeQrUser === item.username && (() => {
                      const currentOrigin = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://gogordon-iu.github.io/gigi-app/';
                      const fullUrl = `${currentOrigin}?key=${item.token}`;
                      return (
                        <View style={{ alignItems: 'center', marginTop: 10, padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2DFF0' }}>
                          <QRCodeDisplay value={fullUrl} size={150} />
                          <Text style={{ fontSize: 11, color: '#706B8E', marginTop: 8, textAlign: 'center' }}>
                            Scan this QR code with a phone to log in instantly.
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: '#706B8E', fontStyle: 'italic', fontSize: 13 }}>
              No active users generated yet. Issue a token above to get started.
            </Text>
          )}
        </View>

        {/* Revoke Access Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#DE350B' }]} />
          <Text style={styles.cardSectionTitle}> Revoke User Access (Manual Search)</Text>
          <Text style={{ color: '#706B8E', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
             Revoke a user's token manually by typing their name below.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Enter user ID to revoke (e.g. mrs_smith)"
              placeholderTextColor="#8F8AA9"
              onSubmitEditing={(e) => {
                const val = e.nativeEvent.text.trim();
                if (val) handleToggleBlacklist(val);
              }}
            />
          </View>

          {blacklist.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={styles.inputLabel}>Revoked Accounts:</Text>
              {blacklist.map((user) => (
                <View key={user} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFEBEF', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#FFCCD6' }}>
                  <Text style={{ color: '#DE350B', fontWeight: '700', fontSize: 14 }}>{user}</Text>
                  <TouchableOpacity onPress={() => handleToggleBlacklist(user)} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1.5, borderColor: '#FFCCD6' }}>
                    <Text style={{ color: '#DE350B', fontSize: 12, fontWeight: '700' }}>Restore</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#706B8E', fontStyle: 'italic', fontSize: 13 }}>No accounts currently revoked.</Text>
          )}
        </View>
      </View>
    );
  };
  // Duplicate activeTab removed

  // Activity Planner State
  const [activityPrompt, setActivityPrompt] = useState('');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [plannedFolder, setPlannedFolder] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [generatingImages, setGeneratingImages] = useState<{ [key: string]: boolean }>({});
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [selectedImageSize, setSelectedImageSize] = useState<'1024x1024' | '512x512' | '256x256'>('1024x1024');
  const imageBase64Cache = useRef<{ [key: string]: string }>({});
  
  const [currentPlan, setCurrentPlan] = useState<{
    activity_title: string;
    target_audience: string;
    approximate_duration: string;
    number_of_students: string;
    steps: Array<any>;
  }>({
    activity_title: "",
    target_audience: "",
    approximate_duration: "",
    number_of_students: "",
    steps: []
  });

  // Custom Interaction States
  const [interactionPrompt, setInteractionPrompt] = useState('');
  const [isGeneratingInteraction, setIsGeneratingInteraction] = useState(false);
  const [currentInteraction, setCurrentInteraction] = useState<any>(null);
  const [plannedInteractionFolder, setPlannedInteractionFolder] = useState<string | null>(null);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);

  // Mode Selection
  const isMobileBrowser = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const [connectionMode, setConnectionMode] = useState<'bluetooth' | 'tcp' | 'websocket' | 'serial'>(
    Platform.OS === 'web' 
      ? (isMobileBrowser ? 'websocket' : 'serial') 
      : 'bluetooth'
  );

  // TCP Config
  const [tcpHost, setTcpHost] = useState('192.168.1.100'); // Default to a standard local network IP
  const [tcpPort, setTcpPort] = useState('5006');
  const [wsPort, setWsPort] = useState('5007');

  // Bluetooth Config
  const [btDevices, setBtDevices] = useState<any[]>([]);
  const [selectedBtDevice, setSelectedBtDevice] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const activeConnection = useRef<any>(null);
  const btSubscription = useRef<any>(null);

  // Script Runner State
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [selectedScript, setSelectedScript] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'demo' | 'script' | 'zhennan'>('demo');
  const [customScript, setCustomScript] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [runningScriptInfo, setRunningScriptInfo] = useState<any>(null);

  // Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsScrollViewRef = useRef<ScrollView>(null);
  const dataBuffer = useRef<string>('');

  // Pulsing animation for HUD dot
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Request Permissions on Mount (Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      requestBluetoothPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Bluetooth devices when changing to BT mode
  useEffect(() => {
    if (connectionMode === 'bluetooth' && RNBluetoothClassic) {
      loadPairedDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionMode]);

  // Scroll to bottom when logs change
  useEffect(() => {
    setTimeout(() => {
      logsScrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [logs]);

  // Pulse animation loop
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
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

  const requestBluetoothPermissions = async () => {
    try {
      const sdkVersion = typeof Platform.Version === 'string' ? parseInt(Platform.Version, 10) : Platform.Version;
      if (sdkVersion >= 31) {
        if (!PermissionsAndroid) return false;
      const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        if (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.GRANTED
        ) {
          addLog('Bluetooth permissions denied.', 'error');
        } else {
          addLog('Bluetooth permissions granted.', 'info');
        }
      } else {
        if (!PermissionsAndroid) return false;
      const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          addLog('Location permission denied (required for BT scanning).', 'error');
        }
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    const newEntry: LogEntry = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      text,
      type,
    };
    setLogs((prev) => [...prev, newEntry]);
  };

  const loadPairedDevices = async () => {
    if (!RNBluetoothClassic) {
      addLog('Bluetooth library is not available.', 'error');
      return;
    }
    try {
      addLog('Loading paired Bluetooth devices...', 'info');
      const paired = await RNBluetoothClassic.getBondedDevices();
      setBtDevices(paired);
      if (paired.length > 0) {
        addLog(`Found ${paired.length} paired device(s).`, 'info');
      } else {
        addLog('No paired Bluetooth devices found.', 'info');
      }
    } catch (e: any) {
      addLog(`Error loading devices: ${e.message}`, 'error');
    }
  };

  const scanDevices = async () => {
    if (!RNBluetoothClassic) return;
    try {
      setIsScanning(true);
      addLog('Scanning for nearby Bluetooth devices...', 'info');
      const discovered = await RNBluetoothClassic.startDeviceDiscovery();
      setBtDevices((prev) => {
        const combined = [...prev, ...discovered];
        const unique = combined.filter(
          (v, i, a) => a.findIndex((t) => t.address === v.address) === i
        );
        return unique;
      });
      addLog('Scan completed.', 'info');
    } catch (e: any) {
      addLog(`Scan failed: ${e.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Unify Socket/Serial Data Receiver
  const handleIncomingData = (dataStr: string) => {
    dataBuffer.current += dataStr;
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
    if (msg.status === 'ready') {
      addLog(`Handshake completed successfully!`, 'success');
      setIsLoadingScripts(true);
      sendRawCommand('LIST');
    } else if (msg.status === 'list') {
      const demoList: ScriptItem[] = (msg.available_demos || []).map((name: string) => ({ name, type: 'demo' }));
      const scriptList: ScriptItem[] = (msg.available_scripts || [])
        .filter((name: string) => name.toLowerCase().includes('teacher'))
        .map((name: string) => ({ name, type: 'script' }));
      const combined = [...demoList, ...scriptList];
      setScripts(combined);
      setIsLoadingScripts(false);
      addLog(`Retrieved ${combined.length} scripts from Gigi.`, 'success');
    } else if (msg.status === 'starting') {
      setIsRunning(true);
      setRunningScriptInfo({ name: msg.name, type: msg.type, pid: msg.pid });
      addLog(`Script "${msg.name}" started successfully (PID: ${msg.pid}).`, 'success');
    } else if (msg.status === 'stopped' || (msg.status === 'failed' && msg.event === 'completed')) {
      setIsRunning(false);
      setRunningScriptInfo(null);
      const isFailed = msg.status === 'failed' || msg.returncode !== 0;
      addLog(
        `Script "${msg.name}" finished. Return code: ${msg.returncode}.`,
        isFailed ? 'error' : 'success'
      );
    } else if (msg.status === 'status') {
      if (msg.running) {
        setIsRunning(true);
        setRunningScriptInfo({ name: msg.name, type: msg.type, pid: msg.pid });
        addLog(`Gigi status: active running "${msg.name}" (PID: ${msg.pid})`, 'info');
      } else {
        setIsRunning(false);
        setRunningScriptInfo(null);
        addLog('Gigi status: idle, ready to execute.', 'info');
      }
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
      addLog(`Error: ${msg.message}`, 'error');
      setIsLoadingScripts(false);
      setIsSavingPlan(false);
      if (msg.available_demos || msg.available_scripts) {
        const demoList: ScriptItem[] = (msg.available_demos || []).map((name: string) => ({ name, type: 'demo' }));
        const scriptList: ScriptItem[] = (msg.available_scripts || [])
          .filter((name: string) => name.toLowerCase().includes('teacher'))
          .map((name: string) => ({ name, type: 'script' }));
        setScripts([...demoList, ...scriptList]);
      }
    } else {
      addLog(JSON.stringify(msg), 'info');
    }
  };

  // Planner State Helpers
  const handleUpdateMeta = (key: string, value: string) => {
    setCurrentPlan(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleUpdateStep = (index: number, key: string, value: any) => {
    setCurrentPlan(prev => {
      const newSteps = [...prev.steps];
      if (key === 'suggested_topics') {
        newSteps[index] = {
          ...newSteps[index],
          [key]: typeof value === 'string' ? value.split(',').map((t: string) => t.trim()) : value
        };
      } else {
        newSteps[index] = {
          ...newSteps[index],
          [key]: value
        };
      }
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const handleAddStep = () => {
    setCurrentPlan(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          step_type: 'canned',
          sub_steps: [
            {
              text: 'Hello students!',
              facial: '[smile]',
              movement: '[home]'
            }
          ]
        }
      ]
    }));
  };

  const handleRemoveStep = (index: number) => {
    setCurrentPlan(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index);
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const handleChangeStepType = (index: number, newType: 'canned' | 'open') => {
    setCurrentPlan(prev => {
      const newSteps = [...prev.steps];
      const oldStep = newSteps[index];
      if (newType === 'canned') {
        const script = oldStep.robot_script || oldStep.goal || 'Hello students!';
        newSteps[index] = {
          step_type: 'canned',
          sub_steps: [
            {
              text: script,
              facial: '[smile]',
              movement: '[home]'
            }
          ]
        };
      } else {
        const text = (oldStep.sub_steps && oldStep.sub_steps[0]?.text) || oldStep.robot_script || 'Facilitate discussion';
        newSteps[index] = {
          step_type: 'open',
          goal: text,
          suggested_topics: [],
          closing_condition: 'After 2-3 students share',
          robot_script: text
        };
      }
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const handleUpdateSubStep = (stepIndex: number, subStepIndex: number, key: string, value: any) => {
    setCurrentPlan(prev => {
      const newSteps = [...prev.steps];
      const step = { ...newSteps[stepIndex] };
      const newSubSteps = [...(step.sub_steps || [])];
      newSubSteps[subStepIndex] = {
        ...newSubSteps[subStepIndex],
        [key]: value
      };
      step.sub_steps = newSubSteps;
      newSteps[stepIndex] = step;
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const handleAddSubStep = (stepIndex: number) => {
    setCurrentPlan(prev => {
      const newSteps = [...prev.steps];
      const step = { ...newSteps[stepIndex] };
      const newSubSteps = [...(step.sub_steps || []), { text: '', facial: '[smile]', movement: '[home]' }];
      step.sub_steps = newSubSteps;
      newSteps[stepIndex] = step;
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const handleRemoveSubStep = (stepIndex: number, subStepIndex: number) => {
    setCurrentPlan(prev => {
      const newSteps = [...prev.steps];
      const step = { ...newSteps[stepIndex] };
      const newSubSteps = (step.sub_steps || []).filter((_: any, idx: number) => idx !== subStepIndex);
      step.sub_steps = newSubSteps;
      newSteps[stepIndex] = step;
      return {
        ...prev,
        steps: newSteps
      };
    });
  };

  const compressImageWeb = (base64Str: string, maxWidth = 512, maxHeight = 512): Promise<string> => {
    return new Promise((resolve) => {
      const img = new (window as any).Image();
      img.src = `data:image/png;base64,${base64Str}`;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const compressedBase64 = dataUrl.split(',')[1];
          resolve(compressedBase64);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const getPlanImages = () => {
    const images: Array<{
      stepIndex: number;
      subStepIndex?: number;
      filename: string;
      prompt: string;
      url: string;
      key: string;
    }> = [];
    
    (currentPlan.steps || []).forEach((step, stepIndex) => {
      if (step.step_type === 'canned') {
        (step.sub_steps || []).forEach((subStep: any, subStepIndex: number) => {
          const facial = subStep.facial || '';
          const hasImageInFacial = facial.startsWith('[image:') || facial.includes('[image:');
          if (hasImageInFacial || subStep.image_filename || subStep.image_prompt) {
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
                key: `step-${stepIndex}-sub-${subStepIndex}`
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
            key: `step-${stepIndex}`
          });
        }
      }
    });
    
    return images;
  };

  const generateImageFor = async (imageKey: { stepIndex: number, subStepIndex?: number, prompt: string, filename: string }) => {
    const { stepIndex, subStepIndex, prompt, filename } = imageKey;
    const uniqueKey = subStepIndex !== undefined ? `step-${stepIndex}-sub-${subStepIndex}` : `step-${stepIndex}`;
    
    if (generatingImages[uniqueKey]) return;
    
    setGeneratingImages(prev => ({ ...prev, [uniqueKey]: true }));
    addLog(`DALL-E request queued for image: "${filename}" (${selectedImageSize})`, 'info');
    
    try {
      const endpoint = `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.dalleDeploymentName}/images/generations?api-version=2024-02-01`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': decryptedApiKey || (AZURE_OPENAI_CONFIG as any).apiKey || '',
        },
        body: JSON.stringify({
          prompt: prompt,
          n: 1,
          size: selectedImageSize
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DALL-E HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      const generatedBase64 = result.data?.[0]?.b64_json;
      if (!generatedBase64) {
        throw new Error("No image data returned from DALL-E service.");
      }
      
      let dataUri = '';
      try {
        if (FileSaver && FileSaver.saveBase64Image) {
          dataUri = await FileSaver.saveBase64Image(generatedBase64, filename);
        } else {
          dataUri = `data:image/png;base64,${generatedBase64}`;
        }
      } catch (err) {
        dataUri = `data:image/png;base64,${generatedBase64}`;
      }
      
      let compressedBase64 = generatedBase64;
      if (Platform.OS === 'web') {
        try {
          compressedBase64 = await compressImageWeb(generatedBase64);
          addLog(`Web: Compressed image "${filename}" before caching.`, 'info');
        } catch (e) {
          console.warn("Failed to compress image on web", e);
        }
      }
      imageBase64Cache.current[filename] = compressedBase64;
      
      setCurrentPlan(prev => {
        const newSteps = [...prev.steps];
        if (subStepIndex !== undefined) {
          const step = { ...newSteps[stepIndex] };
          const newSubSteps = [...(step.sub_steps || [])];
          newSubSteps[subStepIndex] = {
            ...newSubSteps[subStepIndex],
            image_url: dataUri
          };
          step.sub_steps = newSubSteps;
          newSteps[stepIndex] = step;
        } else {
          newSteps[stepIndex] = {
            ...newSteps[stepIndex],
            image_url: dataUri
          };
        }
        return {
          ...prev,
          steps: newSteps
        };
      });
      
      addLog(`DALL-E image generated successfully for: "${filename}"`, 'success');
    } catch (err: any) {
      addLog(`DALL-E generation failed for "${filename}": ${err.message}`, 'error');
      Alert.alert('Image Generation Error', err.message);
    } finally {
      setGeneratingImages(prev => ({ ...prev, [uniqueKey]: false }));
    }
  };

  const generateAllImages = async () => {
    const images = getPlanImages().filter(img => !img.url);
    if (images.length === 0) {
      Alert.alert('All Clear', 'All referenced images already have generated URLs.');
      return;
    }
    
    setIsGeneratingAll(true);
    addLog(`Starting sequential generation for ${images.length} images...`, 'info');
    
    for (const img of images) {
      try {
        await generateImageFor(img);
      } catch (err: any) {
        addLog(`Generation halted: error generating "${img.filename}": ${err.message}`, 'error');
        break;
      }
    }
    
    setIsGeneratingAll(false);
    addLog('Batch image generation process completed.', 'info');
  };

  const generateActivityPlan = async () => {
    if (!activityPrompt.trim()) {
      Alert.alert('Error', 'Please describe the activity first.');
      return;
    }

    if (!decryptedApiKey && !(AZURE_OPENAI_CONFIG as any).apiKey) {
      Alert.alert(
        'Missing API Key',
        'Azure OpenAI API key is missing. Please authenticate using the passcode.'
      );
      return;
    }

    setIsGeneratingPlan(true);
    addLog(`Initiating LLM synthesis for: "${activityPrompt.substring(0, 40)}..."`, 'info');

    try {
      const systemPrompt = `You are an expert educational robot activity designer.
Your goal is to transform a brief activity description into a structured Activity Plan for a robot working with children.
The robot facilitates group activities to foster soft skills (Creativity, Curiosity, Growth Mindset, Collaboration).

RELIES ON:
${STRATEGY_CATALOG_STR}

OUTPUT FORMAT:
You must return a strictly valid JSON object with the following structure:
{
  "activity_title": "String",
  "target_audience": "String (Grade/Age)",
  "approximate_duration": "String",
  "number_of_students": "String (e.g., '10-15 students')",
  "steps": [
    {
      "step_type": "canned",
      "sub_steps": [
        {
          "text": "Exact words the robot should say in this sub-step.",
          "facial": "Facial expression code (e.g. '[smile]', '[curious face]') OR if there is an image to show: '[image:image_filename.png]'",
          "movement": "Movement/gesture code (e.g. '[wave]', '[nod]', '[gesture to students]', '[home]')",
          "image_filename": "Required ONLY if facial is '[image:filename.png]'. Must match the filename in facial.",
          "image_prompt": "Required ONLY if facial is '[image:filename.png]'. A highly detailed image prompt for DALL-E 3 to generate a clean, educational, kid-friendly 3D digital illustration.",
          "image_url": ""
        }
      ]
    },
    {
      "step_type": "open",
      "goal": "Description of the interactive goal",
      "suggested_topics": ["Topic 1", "Topic 2"],
      "closing_condition": "Explicit condition for when to move to the next step (e.g., 'After 2-3 students share')",
      "robot_script": "Initial words the robot says when introducing this open step.",
      "image_filename": "Optional. Local filename if an image is shown for this step (e.g. 'habitat_design.png')",
      "image_prompt": "Optional. A detailed DALL-E 3 prompt for generating the image.",
      "image_url": ""
    }
  ]
}

INSTRUCTIONS:
1. Break the activity into a linear sequence of steps.
2. Alternate between "canned" (fixed robot speech/actions via sub_steps) and "open" (interactive discussions/brainstorming) steps.
3. Every canned step MUST use the "sub_steps" array. Break the speech into logical sentences/paragraphs in sub_steps.
4. "open": Use for discussions, brainstorming, Q&A, or feedback. The robot will dynamically facilitate these.
5. Limit visual assets strictly to a maximum of 5 images per activity plan.
6. Place images only at strategic, highly educational points (e.g. illustrating a complex concept or visualizing a central example). Avoid generating illustrations for transitions, greetings, or basic instructions.
7. For canned sub-steps with an image, set "facial" to "[image:unique_name.png]", set "image_filename" to "unique_name.png", set "image_prompt" to a vivid DALL-E description, and set "image_url" to "".
8. For open steps with an image, set "image_filename" to "unique_name.png", set "image_prompt" to a vivid DALL-E description, and set "image_url" to "".
9. Ensure the tone is friendly, encouraging, and age-appropriate.
`;

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
              { role: 'user', content: `Activity Description: ${activityPrompt}` }
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const rawContent = responseData.choices[0].message.content;
      const parsedPlan = JSON.parse(rawContent);

      imageBase64Cache.current = {};
      setCurrentPlan(parsedPlan);
      setPlannedFolder(null); // Reset saved folder since it's new
      addLog(`Plan generated successfully: "${parsedPlan.activity_title}"`, 'success');
    
    // Increment generation count in localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('gigi_issued_tokens');
        if (stored) {
          const tokens = JSON.parse(stored);
          const currentUser = loggedInUser.toLowerCase().replace(/\s+/g, '_');
          const updated = tokens.map((t: any) => {
            if (t.username === currentUser) {
              return { ...t, generationCount: (t.generationCount || 0) + 1 };
            }
            return t;
          });
          localStorage.setItem('gigi_issued_tokens', JSON.stringify(updated));
          setIssuedTokens(updated);
        }
      }
    } catch {}
    } catch (err: any) {
      addLog(`LLM Synthesis failed: ${err.message}`, 'error');
      Alert.alert('Synthesis Error', err.message);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const savePlanToRobot = async () => {
    if (!activeConnection.current || connectionStatus !== 'connected') {
      Alert.alert('Offline', 'Please establish connection to Gigi robot first.');
      return;
    }

    if (!currentPlan.activity_title) {
      Alert.alert('Empty Plan', 'There is no plan loaded/generated to save.');
      return;
    }

    setIsSavingPlan(true);
    addLog(`Transmitting activity plan to robot...`, 'info');

    // Extract all base64-encoded images from the steps/sub-steps
    const imagesDict: { [key: string]: string } = {};
    (currentPlan.steps || []).forEach(step => {
      if (step.step_type === 'canned') {
        (step.sub_steps || []).forEach((subStep: any) => {
          if (subStep.image_filename) {
            const cached = imageBase64Cache.current[subStep.image_filename];
            if (cached) {
              imagesDict[subStep.image_filename] = cached;
            }
          }
        });
      } else if (step.step_type === 'open') {
        if (step.image_filename) {
          const cached = imageBase64Cache.current[step.image_filename];
          if (cached) {
            imagesDict[step.image_filename] = cached;
          }
        }
      }
    });

    // Create a safe, unique folder name
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
    const sanitizedTitle = currentPlan.activity_title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 30);
    const folderName = `activity_plan_${timestamp}_${sanitizedTitle}`;

    // Clean up plan image_base64 data from the plan JSON itself before storing on the robot (so we don't save massive duplicate data inside the plan.json)
    const cleanedPlanSteps = (currentPlan.steps || []).map(step => {
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

    const cleanedPlan = {
      ...currentPlan,
      steps: cleanedPlanSteps
    };

    const saveCommandObj = {
      command: "save_plan",
      name: folderName,
      plan: cleanedPlan,
      images: imagesDict
    };

    try {
      const payloadString = JSON.stringify(saveCommandObj);
      await activeConnection.current.send(payloadString + '\n');
    } catch (err: any) {
      addLog(`Transmission failed: ${err.message}`, 'error');
      Alert.alert('Transmission Error', err.message);
      setIsSavingPlan(false);
    }
  };

  const runActivityPlan = () => {
    if (!plannedFolder) {
      Alert.alert('Not Synced', 'Please save the plan to the robot first.');
      return;
    }
    sendRawCommand(`RUN ${plannedFolder}`);
  };

  const generateCustomInteraction = async () => {
    if (!interactionPrompt.trim()) {
      Alert.alert('Error', 'Please describe the custom interaction first.');
      return;
    }

    if (!decryptedApiKey && !(AZURE_OPENAI_CONFIG as any).apiKey) {
      Alert.alert(
        'Missing API Key',
        'Azure OpenAI API key is missing. Please authenticate using the passcode.'
      );
      return;
    }

    setIsGeneratingInteraction(true);
    addLog(`Initiating LLM custom interaction synthesis for: "${interactionPrompt.substring(0, 40)}..."`, 'info');

    try {
      const systemPrompt = `You are an expert social robot interaction designer.
Your goal is to transform a description of a custom robot game or activity into a structured, highly versatile State Machine JSON file.
The robot (Gigi) has the following capabilities:
1. Speech: TTS with lip-sync and gestures.
2. Audition: Speech-to-text input with custom timeouts.
3. Vision: Face tracking, gaze shifting, and looking for specific gestures (like 'Thumbs Up').
4. LLM: Dynamic prompt execution, classification, extraction, and generation.
5. Face Expression/Display: Change facial expression, show image files, or play video files on the robot's face.
6. Variables & Logic: State-variable initialization, expression evaluation, and conditional state transitions.

OUTPUT FORMAT:
You must return a strictly valid JSON object with the following structure:
{
  "interaction_title": "String (Title of the game/activity)",
  "variables": {
    "variable_name": "initial_value"
  },
  "states": {
    "state_name": {
      "actions": [
        {
          "type": "speak",
          "text": "The exact words the robot speaks. Can interpolate variables using {variable_name}.",
          "movement": "Optional gesture code (e.g. 'wave_hello', 'clap', 'nod', 'open_arms', 'home')",
          "expression": "Optional facial expression (e.g. 'smile', 'sad', 'curious')"
        },
        {
          "type": "display",
          "display_type": "image" or "video" or "expression",
          "value": "filename (e.g. 'chest.png') or expression_name (e.g. 'smile')"
        },
        {
          "type": "listen",
          "variable": "Variable name to store the user's spoken input",
          "timeout": 10
        },
        {
          "type": "vision",
          "mode": "look_for_gesture" or "look_at_face",
          "target": "Gesture name (e.g. 'Thumbs Up') or 'face'",
          "variable": "Variable name to store true/false",
          "timeout": 8
        },
        {
          "type": "llm",
          "system_prompt": "Instructions for classification or extraction",
          "user_prompt": "Prompt to send. Can interpolate variables using {variable_name}.",
          "variable": "Variable name to store the LLM text output"
        },
        {
          "type": "evaluate",
          "expression": "Python expression to execute (e.g., 'attempts = attempts + 1')"
        }
      ],
      "transitions": [
        {
          "condition": "Python condition to evaluate (e.g., 'parsed_guess == secret_number')",
          "target": "Next state name to jump to"
        },
        {
          "target": "Default next state (or 'exit' to end the game)"
        }
      ]
    }
  }
}

INSTRUCTIONS:
1. Initialize all game variables (like secret number, attempts, score, state flag) in the 'variables' map.
2. Structure the game logic cleanly using named states. Common states: 'welcome', 'game_mode', 'ask_question', 'process_response', 'correct', 'incorrect', 'game_over', 'play_again'.
3. Use the 'llm' action to classify user speech or extract parameters.
4. Keep the interaction engaging by combining speech, gestures, and facial expressions.
`;

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
              { role: 'user', content: interactionPrompt }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      const contentText = result.choices?.[0]?.message?.content;
      if (!contentText) {
        throw new Error("No content returned from LLM completion.");
      }

      const parsedJson = JSON.parse(contentText);
      setCurrentInteraction(parsedJson);
      setPlannedInteractionFolder(null); // Reset sync status
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
      Alert.alert('Offline', 'Please connect to the Gigi robot first.');
      return;
    }

    setIsSavingInteraction(true);
    addLog(`Syncing custom interaction plan: "${currentInteraction.interaction_title || 'untitled'}"...`, 'info');

    const timestampStr = new Date().toISOString().replace(/[-:T]/g, '_').substring(0, 15);
    const sanitizedTitle = (currentInteraction.interaction_title || 'custom_interaction')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .substring(0, 30);
    const folderName = `custom_interaction_${timestampStr}_${sanitizedTitle}`;

    const saveCommandObj = {
      command: "save_custom_interaction",
      name: folderName,
      interaction: currentInteraction,
      images: {}
    };

    try {
      const payloadString = JSON.stringify(saveCommandObj);
      await activeConnection.current.send(payloadString + '\n');
    } catch (err: any) {
      addLog(`Transmission failed: ${err.message}`, 'error');
      Alert.alert('Transmission Error', err.message);
      setIsSavingInteraction(false);
    }
  };

  const renderInteractionPlanner = () => {
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Synthesis Prompt Card */}
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>A. Design Custom Interaction</Text>
          
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
              "Mastermind: A 4-digit secret number guessing game with Gigi",
              "Math Quest: Gigi asks multiplication questions to unlock a chest",
              "Receptionist: Gigi greets visitors, asks their name, tracks faces",
              "Story game: Gigi and user alternate sentences to build a story"
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
              style={[styles.input, styles.multilineInput, { minHeight: 250, fontFamily: 'monospace', fontSize: 12, backgroundColor: '#1A1829', color: '#00FF66' }]}
              multiline
              value={typeof currentInteraction === 'string' ? currentInteraction : JSON.stringify(currentInteraction, null, 2)}
              onChangeText={(text) => {
                try {
                  const parsed = JSON.parse(text);
                  setCurrentInteraction(parsed);
                } catch {
                  // Allow typing invalid json momentarily, but store as string
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
                  (!plannedInteractionFolder || connectionStatus !== 'connected') && styles.buttonDisabled
                ]} 
                onPress={() => {
                  if (plannedInteractionFolder) {
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

  const connectToGigi = async () => {
    setConnectionError(null);
    setConnectionStatus('connecting');
    addLog(`Initiating ${connectionMode.toUpperCase()} link to Gigi...`, 'info');

    if (connectionMode === 'serial') {
      try {
        if (!(navigator as any).serial) {
          throw new Error("Web Serial API is not supported on this browser. Please use Chrome, Edge, or Opera.");
        }
        addLog("Requesting Web Serial port access...", "info");
        const port = await (navigator as any).serial.requestPort();
        addLog("Opening Serial port at 115200 baud...", "info");
        await port.open({ baudRate: 115200 });
        setConnectionStatus('connected');
        addLog('Web Serial connection established successfully!', 'success');
        setIsLoadingScripts(true);

        const textDecoder = new TextDecoderStream();
        const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();

        // Read loop in background
        (async () => {
          let buffer = "";
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              if (value) {
                buffer += value;
                while (buffer.includes("\n")) {
                  const idx = buffer.indexOf("\n");
                  const line = buffer.substring(0, idx + 1);
                  buffer = buffer.substring(idx + 1);
                  handleIncomingData(line);
                }
              }
            }
          } catch (e: any) {
            addLog(`Serial read error: ${e.message}`, 'error');
            disconnectFromGigi();
          } finally {
            reader.releaseLock();
          }
        })();

        activeConnection.current = {
          send: async (data: string) => {
            const encoder = new TextEncoder();
            const writerStream = port.writable.getWriter();
            await writerStream.write(encoder.encode(data));
            writerStream.releaseLock();
          },
          disconnect: async () => {
            try {
              await reader.cancel();
              await readableStreamClosed.catch(() => {});
              await port.close();
            } catch (e) {
              console.log("Error closing serial port", e);
            }
            setConnectionStatus('disconnected');
          }
        };

        setTimeout(() => {
          sendRawCommand('LIST');
        }, 800);

      } catch (e: any) {
        setConnectionStatus('disconnected');
        setConnectionError(e.message);
        addLog(`Web Serial link failed: ${e.message}`, 'error');
      }
    } else if (connectionMode === 'websocket') {
      try {
        const wsUrl = `ws://${tcpHost}:${wsPort}`;
        addLog(`Connecting to WebSocket: ${wsUrl}...`, 'info');
        const socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setConnectionStatus('connected');
          addLog('WebSocket link established successfully.', 'success');
          setIsLoadingScripts(true);
          setTimeout(() => {
            sendRawCommand('LIST');
          }, 500);
        };

        socket.onmessage = (event) => {
          handleIncomingData(event.data);
        };

        socket.onerror = (err) => {
          addLog('WebSocket connection error.', 'error');
          disconnectFromGigi();
        };

        socket.onclose = () => {
          addLog('WebSocket Connection link closed.', 'info');
          setConnectionStatus('disconnected');
        };

        activeConnection.current = {
          send: async (data: string) => {
            socket.send(data);
          },
          disconnect: () => {
            socket.close();
          }
        };
      } catch (e: any) {
        setConnectionStatus('disconnected');
        setConnectionError(e.message);
        addLog(`WebSocket initiation failed: ${e.message}`, 'error');
      }
    } else if (connectionMode === 'tcp') {
      try {
        const client = TcpSocket.createConnection({
          port: parseInt(tcpPort, 10),
          host: tcpHost,
        }, () => {
          setConnectionStatus('connected');
          addLog('TCP socket connected successfully.', 'success');
          setIsLoadingScripts(true);
        });

        client.on('data', (data) => {
          handleIncomingData(data.toString('utf8'));
        });

        client.on('error', (err) => {
          addLog(`Link error: ${err.message}`, 'error');
          setConnectionError(err.message);
          disconnectFromGigi();
        });

        client.on('close', () => {
          addLog('TCP Connection link closed.', 'info');
          setConnectionStatus('disconnected');
        });

        activeConnection.current = {
          send: async (data: string) => {
            client.write(data);
          },
          disconnect: () => {
            client.destroy();
          }
        };
      } catch (e: any) {
        setConnectionStatus('disconnected');
        setConnectionError(e.message);
        addLog(`Link initiation failed: ${e.message}`, 'error');
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
          addLog(`Bluetooth linked successfully!`, 'success');

          const subscription = isConnected.onDataReceived((event: any) => {
            // Append \n since react-native-bluetooth-classic strips the delimiter
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
            }
          };
          
          setIsLoadingScripts(true);
          // Wait briefly to make sure the channel is fully settled and ready to receive.
          setTimeout(() => {
            sendRawCommand('LIST');
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
    if (activeConnection.current) {
      activeConnection.current.disconnect();
      activeConnection.current = null;
    }
    setConnectionStatus('disconnected');
    setScripts([]);
    setSelectedScript('');
    setIsRunning(false);
    setRunningScriptInfo(null);
    setIsLoadingScripts(false);
    addLog('Disconnected from Gigi.', 'info');
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

  const handlePing = () => {
    setIsLoadingScripts(true);
    sendRawCommand('STATUS');
    sendRawCommand('LIST');
  };

  const handleRunScript = () => {
    const scriptToRun = customScript.trim() || selectedScript;
    if (!scriptToRun) {
      Alert.alert('Error', 'Please select a script or write a name manually.');
      return;
    }
    sendRawCommand(`RUN ${scriptToRun}`);
  };

  const handleStopScript = () => {
    sendRawCommand('🛑 Emergency Stop');
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  const renderBtDevice = ({ item }: { item: any }) => {
    const isSelected = selectedBtDevice?.address === item.address;
    return (
      <TouchableOpacity
        key={item.address}
        style={[styles.deviceItem, isSelected && styles.deviceItemSelected]}
        onPress={() =>  setSelectedBtDevice(item)}
        activeOpacity={0.7}
       accessibilityRole="button" focusable={true} accessibilityLabel={`Select Bluetooth device ${item.name || 'Unknown'} with address ${item.address}`} accessibilityState={{ selected: isSelected }}>
        <View style={styles.deviceRow}>
          <Text style={styles.deviceIcon}>🔵</Text>
          <View style={styles.deviceInfoContainer}>
            <Text style={styles.deviceName}>{item.name || 'Unnamed Robot'}</Text>
            <Text style={styles.deviceAddress}>{item.address}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Log filter state
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'output' | 'error'>('all');

  const filteredLogs = logs.filter((log) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'info') return log.type === 'info' || log.type === 'success';
    if (logFilter === 'output') return log.type === 'raw' || log.type === 'output';
    if (logFilter === 'error') return log.type === 'error';
    return true;
  });

  // Sort Bluetooth devices: search keywords first, then alphabetical
  const sortedBtDevices = [...btDevices].sort((a, b) => {
    const nameA = (a.name || '').toLowerCase();
    const nameB = (b.name || '').toLowerCase();
    
    const keywords = ['gigi', 'orangepi', 'opi', 'robot'];
    const matchesA = keywords.some(kw => nameA.includes(kw));
    const matchesB = keywords.some(kw => nameB.includes(kw));
    
    if (matchesA && !matchesB) return -1;
    if (!matchesA && matchesB) return 1;
    
    return nameA.localeCompare(nameB);
  });

  return (
    <View style={styles.container}>
      {/* HUD Bar */}
      <View style={styles.hudBar}>
        <View style={styles.hudTitleContainer}>
          <Text style={styles.hudTitle}>🤖 Gigi Classroom Assistant</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}><Text style={[styles.hudSubTitle, { marginTop: 0 }]}>Your Interactive Learning Portal</Text>{isAuthenticated ? (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{loggedInUser ? (<Text style={{ fontSize: 12, color: '#5E43F3', fontWeight: '700', backgroundColor: '#F3F0FC', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#D1CCE6' }}>👤 {loggedInUser}</Text>) : null}<TouchableOpacity onPress={handleLogout} style={{ backgroundColor: '#FFEBEF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#FFCCD6' }} accessibilityRole="button" focusable={true} accessibilityLabel="Log out and clear saved credentials"><Text style={{ color: '#DE350B', fontSize: 11, fontWeight: '700' }}>🚪 Log Out</Text></TouchableOpacity></View>) : null}</View></View>{/* Glowing Status Dot */}
        <View style={[
          styles.statusBadge,
          connectionStatus === 'connected' ? styles.statusBadgeConnected : 
          connectionStatus === 'connecting' ? styles.statusBadgeConnecting : 
          styles.statusBadgeDisconnected
        ]}>
          <Animated.View 
            style={[
              styles.statusDot, 
              connectionStatus === 'connected' ? styles.statusDotConnected : 
              connectionStatus === 'connecting' ? styles.statusDotConnecting : 
              styles.statusDotDisconnected,
              { opacity: pulseAnim }
            ]}
          />
          <Text style={[
            styles.statusLabel, 
            connectionStatus === 'connected' ? styles.statusLabelConnected : 
            connectionStatus === 'connecting' ? styles.statusLabelConnecting : 
            styles.statusLabelDisconnected
          ]}>
            {connectionStatus === 'connected' ? 'ONLINE' : 
             connectionStatus === 'connecting' ? 'LINKING' : 
             'OFFLINE'}
          </Text>
        </View>
      </View>
      {/* Tab Navigation */}
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'console' && styles.tabButtonActive]}
        onPress={() => setActiveTab('console')}
        activeOpacity={0.8}
        accessibilityRole="tab" focusable={true} accessibilityLabel="Console view tab" accessibilityState={{ selected: activeTab === 'console' }}>
        <Text style={[styles.tabButtonText, activeTab === 'console' && styles.tabButtonTextActive]}>
           Chat & Manual Control
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'planner' && styles.tabButtonActive]}
        onPress={() => setActiveTab('planner')}
        activeOpacity={0.8}
        accessibilityRole="tab" focusable={true} accessibilityLabel="Activity Planner tab" accessibilityState={{ selected: activeTab === 'planner' }}>
        <Text style={[styles.tabButtonText, activeTab === 'planner' && styles.tabButtonTextActive]}>
           Lesson Planner
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'interaction' && styles.tabButtonActive]}
        onPress={() => setActiveTab('interaction')}
        activeOpacity={0.8}
        accessibilityRole="tab" focusable={true} accessibilityLabel="Interaction Designer tab" accessibilityState={{ selected: activeTab === 'interaction' }}>
        <Text style={[styles.tabButtonText, activeTab === 'interaction' && styles.tabButtonTextActive]}>
           Interaction Designer
        </Text>
      </TouchableOpacity>
      {userRole === 'admin' && (
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'manager' && styles.tabButtonActive]}
          onPress={() => setActiveTab('manager')}
          activeOpacity={0.8}
          accessibilityRole="tab" focusable={true} accessibilityLabel="User access management tab" accessibilityState={{ selected: activeTab === 'manager' }}>
          <Text style={[styles.tabButtonText, activeTab === 'manager' && styles.tabButtonTextActive]}>
             Manager Panel
          </Text>
        </TouchableOpacity>
      )}
    </View>

      {activeTab === 'console' ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {/* Segmented Control Mode Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
        <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>🔌 Step 1: Connect to Gigi</Text>

        {/* Mode Selector pills */}
        <View style={{ flexDirection: 'row', backgroundColor: '#F4F3F8', borderRadius: 12, padding: 3, borderWidth: 1.5, borderColor: '#E2DFF0', marginBottom: 16 }}>
          {(Platform.OS === 'web' 
            ? (['serial', 'websocket'] as const) 
            : (['bluetooth', 'tcp'] as const)
          ).map((mode) => {
            const isActive = connectionMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: isActive ? '#5E43F3' : 'transparent',
                }}
                onPress={() => setConnectionMode(mode)}
                disabled={connectionStatus !== 'disconnected'}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '700',
                  color: isActive ? '#FFFFFF' : '#706B8E',
                }}>
                  {mode === 'serial' ? '💻 Web Serial' :
                   mode === 'websocket' ? '📡 WebSocket' :
                   mode === 'bluetooth' ? '🔵 Bluetooth' :
                   '🔌 TCP Socket'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Connection descriptions and inputs */}
        {connectionMode === 'serial' && (
          <View style={{ paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ color: '#2A2738', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
              💻 Direct Bluetooth Connection (Web Serial)
            </Text>
            <Text style={{ color: '#706B8E', fontSize: 13, marginTop: 4, lineHeight: 18 }}>
              Make sure your Gigi robot is turned on and paired in your computer's Bluetooth settings first.
              Then click Connect below and choose "oranpi5pro" from the browser list.
            </Text>
          </View>
        )}

        {connectionMode === 'websocket' && (
          <View style={{ paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ color: '#2A2738', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
              📡 Wireless connection (WebSocket over Wi-Fi)
            </Text>
            <Text style={{ color: '#706B8E', fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 }}>
              Connect to your Gigi robot over the local network (Wi-Fi). Enter the robot's IP and WebSocket port:
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Robot IP Address</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45 }]}
                  value={tcpHost}
                  onChangeText={setTcpHost}
                  placeholder="e.g. 192.168.1.100"
                  placeholderTextColor="#8F8AA9"
                  disabled={connectionStatus !== 'disconnected'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>WS Port</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45 }]}
                  value={wsPort}
                  onChangeText={setWsPort}
                  placeholder="5007"
                  placeholderTextColor="#8F8AA9"
                  keyboardType="numeric"
                  disabled={connectionStatus !== 'disconnected'}
                />
              </View>
            </View>
          </View>
        )}

        {connectionMode === 'bluetooth' && (
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
                          style={[
                            styles.deviceItem,
                            isSelected && styles.deviceItemSelected
                          ]}
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
                    <Text style={{ color: '#706B8E', fontSize: 12, marginTop: 4 }}>Make sure Bluetooth is enabled and the device is paired.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {connectionMode === 'tcp' && (
          <View style={{ paddingVertical: 4, marginBottom: 16 }}>
            <Text style={{ color: '#2A2738', fontSize: 15, fontWeight: '700', lineHeight: 20 }}>
              🔌 Direct TCP Socket link
            </Text>
            <Text style={{ color: '#706B8E', fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 }}>
              Connect directly via TCP socket over the local network:
            </Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.inputLabel}>Robot IP Address</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45 }]}
                  value={tcpHost}
                  onChangeText={setTcpHost}
                  placeholder="e.g. 192.168.1.100"
                  placeholderTextColor="#8F8AA9"
                  disabled={connectionStatus !== 'disconnected'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>TCP Port</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45 }]}
                  value={tcpPort}
                  onChangeText={setTcpPort}
                  placeholder="5006"
                  placeholderTextColor="#8F8AA9"
                  keyboardType="numeric"
                  disabled={connectionStatus !== 'disconnected'}
                />
              </View>
            </View>
          </View>
        )}

        {/* Connect Trigger */}
        {connectionStatus === 'disconnected' ? (
          <TouchableOpacity style={styles.connectButton} onPress={connectToGigi} activeOpacity={0.85} accessibilityRole="button" focusable={true} accessibilityLabel="Establish Connection with Gigi robot">
            <Text style={styles.buttonText}>Connect to Gigi</Text>
          </TouchableOpacity>
        ) : connectionStatus === 'connecting' ? (
          <View style={[styles.connectButton, styles.buttonDisabled]}>
            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>Connecting to Gigi...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.disconnectButton} onPress={disconnectFromGigi} activeOpacity={0.85} accessibilityRole="button" focusable={true} accessibilityLabel="Terminate Link and disconnect from Gigi robot">
            <Text style={styles.buttonText}>Disconnect from Gigi</Text>
          </TouchableOpacity>
        )}

        {connectionError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}> Connection Failure: {connectionError}</Text>
          </View>
        )}
      </View>

      {/* Step 2: Select & Run Activity Card */}
      {connectionStatus === 'connected' && (
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#A000FF' }]} />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>🤖 Step 2: Select & Run Activity</Text>
          
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

          {scripts.length > 0 ? (
            <>
              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Available Activities:</Text>
              
              {/* Category Selector/Tabs */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F4F3F8', borderRadius: 10, padding: 3, borderWidth: 1.5, borderColor: '#E2DFF0', marginVertical: 10 }}>
                {(['demo', 'script'] as const).map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, backgroundColor: isActive ? '#FFFFFF' : 'transparent' }}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isActive ? '#5E43F3' : '#4E4B66' }}>
                        {cat === 'demo' ? '📁 Demo Folder' : '🎓 Teacher Scripts'}
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
                          {s.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>

              {/* Execution Control Row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[
                    styles.runButton,
                    (!selectedScript || isRunning) && styles.buttonDisabled
                  ]}
                  disabled={!selectedScript || isRunning}
                  onPress={handleRunScript}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>🚀 RUN ACTIVITY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.stopButton,
                    !isRunning && styles.buttonDisabled
                  ]}
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
                <Text style={styles.emptySubText}>Click the button above to load activities from the Gigi robot.</Text>
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
        </View>
      )}

      {/* Real-time holographic console */}          <View style={styles.card}>            <View style={[styles.cardHeaderAccent, { backgroundColor: '#00FF66' }]} />                        <Text style={styles.cardSectionTitle}>💬 Robot Activity & Chat Stream</Text>            {/* Holographic Toolbar for filters and controls */}            <View style={styles.consoleToolbar}>              <View style={styles.filterContainer}>                <TouchableOpacity                  style={[styles.filterChip, logFilter === 'all' && styles.filterChipActive]}                  onPress={() => setLogFilter('all')}                  activeOpacity={0.7}                >                  <Text style={[styles.filterChipText, logFilter === 'all' && styles.filterChipTextActive]}>ALL</Text>                </TouchableOpacity>                <TouchableOpacity                  style={[styles.filterChip, logFilter === 'info' && styles.filterChipActive]}                  onPress={() => setLogFilter('info')}                  activeOpacity={0.7}                >                  <Text style={[styles.filterChipText, logFilter === 'info' && styles.filterChipTextActive]}>INFO</Text>                </TouchableOpacity>                <TouchableOpacity                  style={[styles.filterChip, logFilter === 'output' && styles.filterChipActive]}                  onPress={() => setLogFilter('output')}                  activeOpacity={0.7}                >                  <Text style={[styles.filterChipText, logFilter === 'output' && styles.filterChipTextActive]}>OUT</Text>                </TouchableOpacity>                <TouchableOpacity                  style={[styles.filterChip, logFilter === 'error' && styles.filterChipActive]}                  onPress={() => setLogFilter('error')}                  activeOpacity={0.7}                >                  <Text style={[styles.filterChipText, logFilter === 'error' && styles.filterChipTextActive]}>ERR</Text>                </TouchableOpacity>              </View>              <TouchableOpacity onPress={handleClearLogs} activeOpacity={0.7} style={styles.flushButton}>                <Text style={styles.clearText}>🧹 FLUSH</Text>              </TouchableOpacity>            </View>            <View style={styles.consoleContainer}>              <ScrollView                ref={logsScrollViewRef}                style={styles.consoleScrollView}                nestedScrollEnabled={true}                showsVerticalScrollIndicator={true}              >                {filteredLogs.length > 0 ? (                  filteredLogs.map((log) => {                    let textStyle = styles.logText;                    let icon = '⚙';                    if (log.type === 'success') {                      textStyle = styles.logSuccess;                      icon = '🟢';                    } else if (log.type === 'error') {                      textStyle = styles.logError;                      icon = '🔴';                    } else if (log.type === 'raw') {                      textStyle = styles.logRaw;                      icon = '⚡';                    } else if (log.type === 'info') {                      textStyle = styles.logInfo;                      icon = '📡';                    }                    return (                      <Text key={log.id} style={textStyle}>                        {icon} [{log.timestamp}] {log.text}                      </Text>                    );                  })                ) : (                  <View style={styles.consoleEmptyContainer}>                    <Text style={styles.consolePlaceholder}>🤖 Gigi is ready!</Text>                    <Text style={styles.consoleSubPlaceholder}>Waiting for your command...</Text>                  </View>                )}              </ScrollView>            </View>          </View>        </ScrollView>      ) : activeTab === 'planner' ? (        <ScrollView           style={styles.scrollView}          contentContainerStyle={styles.scrollContent}           showsVerticalScrollIndicator={false}        >          {/* Generation prompt card */}          <View style={styles.card}>            <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />            <Text style={styles.cardSectionTitle}>A. Synthesize New Activity</Text>                        <Text style={styles.inputLabel}>Describe your activity goal</Text>            <TextInput              style={[styles.input, styles.multilineInput]}              multiline              numberOfLines={4}              value={activityPrompt}              onChangeText={setActivityPrompt}              placeholder="e.g. 10 min 'design a habitat on mars' activity for five 3rd graders..."              placeholderTextColor="#48446B"            />            {/* Clickable prompt examples */}            <Text style={styles.exampleHeader}>Preset Templates:</Text>            <View style={styles.exampleRow}>              {[                "10 min 'design a habitat on mars' activity for 3rd graders",                "15 min math multiplication quest for 5th graders",                "5 min bilingual storytelling activity for preschool kids"              ].map((exPrompt) => (                <TouchableOpacity                  key={exPrompt}                  style={styles.exampleChip}                  onPress={() => setActivityPrompt(exPrompt)}                >                  <Text style={styles.exampleChipText} numberOfLines={1}>                    💡 {exPrompt}                  </Text>                </TouchableOpacity>              ))}            </View>            {isGeneratingPlan ? (              <View style={[styles.connectButton, styles.buttonDisabled]}>                <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />                <Text style={styles.buttonText}>LLM COGNITION IN PROGRESS...</Text>              </View>            ) : (              <TouchableOpacity style={styles.connectButton} onPress={generateActivityPlan} activeOpacity={0.85}>                <Text style={styles.buttonText}>GENERATE ACTIVITY PLAN</Text>              </TouchableOpacity>            )}          </View>

      {/* Current plan editor card */}
          {currentPlan.activity_title ? (
            <>
              <View style={styles.card}>
              <View style={[styles.cardHeaderAccent, { backgroundColor: '#00FFE0' }]} />
              <Text style={styles.cardSectionTitle}>📋 Step 2: Review & Modify Lesson Details</Text>

              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>✏️ Lesson Title</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                  multiline
                  value={currentPlan.activity_title}
                  accessibilityLabel="Activity ✏️ Lesson Title Input"
                  onChangeText={(val) => handleUpdateMeta('activity_title', val)}
                />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>👥 Target Audience</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                  multiline
                  value={currentPlan.target_audience}
                  accessibilityLabel="Target 👥 Target Audience Input"
                  onChangeText={(val) => handleUpdateMeta('target_audience', val)}
                />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>⏱️ Approximate Duration</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                  multiline
                  value={currentPlan.approximate_duration}
                  accessibilityLabel="Approximate ⏱️ Approximate Duration Input"
                  onChangeText={(val) => handleUpdateMeta('approximate_duration', val)}
                />
              </View>
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.inputLabel}>👥 Number of Students</Text>
                <TextInput
                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                  multiline
                  value={currentPlan.number_of_students}
                  accessibilityLabel="Number of Students Input"
                  onChangeText={(val) => handleUpdateMeta('number_of_students', val)}
                />
              </View>

              <View style={styles.divider} />
              
              <Text style={[styles.cardSectionTitle, { marginBottom: 12 }]}>📋 Step 3: Lesson Step Sequence</Text>

              {(currentPlan.steps || []).map((step, index) => (
                <View key={index} style={[styles.stepItemCard, step.step_type === 'canned' ? styles.stepItemCanned : styles.stepItemOpen]}>
                  <View style={styles.stepItemHeader}>
                    <View style={styles.stepBadgeRow}>
                      <Text style={styles.stepIndexText}>STEP {index + 1}</Text>
                      <View style={[styles.badge, step.step_type === 'canned' ? styles.badgeCanned : styles.badgeOpen]}>
                        <Text style={styles.badgeText}>{step.step_type === 'canned' ? 'Speech Step' : 'Chat Step'}</Text>
                      </View>
                    </View>
                    
                    {/* Switch type */}
                    <View style={styles.stepTypeToggleRow}>
                      <TouchableOpacity
                        style={[styles.stepTypeToggleBtn, step.step_type === 'canned' && styles.stepTypeToggleBtnActive]}
                        onPress={() =>  handleChangeStepType(index, 'canned')}
                        activeOpacity={0.8}
                       accessibilityRole="button" focusable={true} accessibilityLabel={`Set step ${index + 1} type to 💬 Speech Step`} accessibilityState={{ selected: step.step_type === 'canned' }}>
                        <Text style={styles.stepTypeToggleBtnText}>💬 Speech Step</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.stepTypeToggleBtn, step.step_type === 'open' && styles.stepTypeToggleBtnActive]}
                        onPress={() =>  handleChangeStepType(index, 'open')}
                        activeOpacity={0.8}
                       accessibilityRole="button" focusable={true} accessibilityLabel={`Set step ${index + 1} type to 🤖 open-ended`} accessibilityState={{ selected: step.step_type === 'open' }}>
                        <Text style={styles.stepTypeToggleBtnText}>🤖 Chat Step</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.stepItemBody}>
                    {step.step_type === 'canned' ? (
                      <View>
                        <Text style={styles.stepInputLabel}>💬 Speech Steps List</Text>
                        {(step.sub_steps || []).map((subStep: any, subIndex: number) => {
                          const facialVal = subStep.facial || '';
                          const hasImage = facialVal.startsWith('[image:') || facialVal.includes('[image:') || subStep.image_filename;
                          return (
                            <View key={subIndex} style={styles.subStepCard}>
                              <View style={styles.subStepHeader}>
                                <Text style={styles.subStepIndexText}>Sub-step {subIndex + 1}</Text>
                                <TouchableOpacity 
                                  onPress={() =>  handleRemoveSubStep(index, subIndex)}
                                  activeOpacity={0.7}
                                 accessibilityRole="button" focusable={true} accessibilityLabel={`Remove sub-step ${subIndex + 1} from step ${index + 1}`}>
                                  <Text style={styles.removeSubStepText}>✕ Remove</Text>
                                </TouchableOpacity>
                              </View>

                              <Text style={styles.subStepInputLabel}>Speech Script</Text>
                              <TextInput
                                style={[styles.input, styles.subStepTextInput]}
                                multiline
                                value={subStep.text}
                                accessibilityLabel={`Sub-step ${subIndex + 1} text content`}
                                onChangeText={(val) => handleUpdateSubStep(index, subIndex, 'text', val)}
                                placeholder="What the robot says..."
                                placeholderTextColor="#8F8AA9"
                              />

                              <View style={{ marginTop: 6 }}>
                                <Text style={styles.subStepInputLabel}>Facial Expression</Text>
                                <TextInput
                                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                                  multiline
                                  value={subStep.facial}
                                  accessibilityLabel={`Sub-step ${subIndex + 1} robot facial command`}
                                  onChangeText={(val) => handleUpdateSubStep(index, subIndex, 'facial', val)}
                                  placeholder="e.g. [smile] or [image:filename.png]"
                                  placeholderTextColor="#8F8AA9"
                                />
                              </View>
                              <View style={{ marginTop: 6 }}>
                                <Text style={styles.subStepInputLabel}>Movement/Gesture</Text>
                                <TextInput
                                  style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                                  multiline
                                  value={subStep.movement}
                                  accessibilityLabel={`Sub-step ${subIndex + 1} robot movement command`}
                                  onChangeText={(val) => handleUpdateSubStep(index, subIndex, 'movement', val)}
                                  placeholder="e.g. [wave] or [nod]"
                                  placeholderTextColor="#8F8AA9"
                                />
                              </View>

                              {hasImage ? (
                                <View style={styles.subStepImageContainer}>
                                  <Text style={styles.subStepInputLabel}>Saved Illustration Image Name</Text>
                                  <TextInput
                                    style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                                    multiline
                                    value={subStep.image_filename}
                                    accessibilityLabel={`Sub-step ${subIndex + 1} image filename`}
                                    onChangeText={(val) => {
                                      handleUpdateSubStep(index, subIndex, 'image_filename', val);
                                      if (val) {
                                        handleUpdateSubStep(index, subIndex, 'facial', `[image:${val}]`);
                                      }
                                    }}
                                    placeholder="e.g. wave_types.png"
                                    placeholderTextColor="#8F8AA9"
                                  />

                                  <Text style={styles.subStepInputLabel}>Illustration Drawing Prompt</Text>
                                  <TextInput
                                    style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                                    multiline
                                    value={subStep.image_prompt}
                                    accessibilityLabel={`Sub-step ${subIndex + 1} image generation prompt`}
                                    onChangeText={(val) => handleUpdateSubStep(index, subIndex, 'image_prompt', val)}
                                    placeholder="A colorful diagram of wave types..."
                                    placeholderTextColor="#8F8AA9"
                                  />
                                  
                                  {subStep.image_url ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                                      <Image
                                        source={{ uri: subStep.image_url }}
                                        style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#F4F3F8', borderWidth: 1.5, borderColor: '#E2DFF0' }}
                                        resizeMode="cover"
                                        accessibilityLabel={`Illustration preview for sub-step ${subIndex + 1}: ${subStep.image_prompt}`}
                                      />
                                      <Text style={[styles.urlLoadedText, { flex: 1 }]}>✓ Image URL Ready: {subStep.image_url.substring(0, 30)}...</Text>
                                    </View>
                                  ) : (
                                    <Text style={styles.urlPendingText}>⏳ URL Pending. Generate below.</Text>
                                  )}
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.subStepAddImageBtn}
                                  onPress={() =>  {
                                    const defaultFilename = `step_${index + 1}_sub_${subIndex + 1}.png`;
                                    handleUpdateSubStep(index, subIndex, 'facial', `[image:${defaultFilename}]`);
                                    handleUpdateSubStep(index, subIndex, 'image_filename', defaultFilename);
                                    handleUpdateSubStep(index, subIndex, 'image_prompt', 'A detailed, colorful illustration...');
                                  }}
                                 accessibilityRole="button" focusable={true} accessibilityLabel={`Add illustration image slot to sub-step ${subIndex + 1} of step ${index + 1}`}>
                                  <Text style={styles.subStepAddImageBtnText}>🖼 🖼️ Add Illustration Image</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                        <TouchableOpacity 
                          style={styles.addSubStepBtn} 
                          onPress={() =>  handleAddSubStep(index)}
                         accessibilityRole="button" focusable={true} accessibilityLabel={`Add new sub-step to step ${index + 1}`}>
                          <Text style={styles.addSubStepBtnText}>➕ ➕ Add New Speech Line</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View>
                        <Text style={styles.stepInputLabel}>🤖 What Gigi will do in this step</Text>
                        <TextInput
                          style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                          multiline
                          value={step.goal || ''}
                          onChangeText={(val) =>  handleUpdateStep(index, 'goal', val)}
                         accessibilityLabel="Step goal description" />
                        
                        <Text style={styles.stepInputLabel}>💬 What Gigi will say to introduce this step</Text>
                        <TextInput
                          style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]}
                          multiline
                          value={step.robot_script || ''}
                          onChangeText={(val) =>  handleUpdateStep(index, 'robot_script', val)}
                         accessibilityLabel="Step robot speech script" />

                        <Text style={styles.stepInputLabel}>🔑 Keywords / Hint topics (separated by commas)</Text>
                        <TextInput
                          style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                          multiline
                          value={(step.suggested_topics || []).join(', ')}
                          onChangeText={(val) =>  handleUpdateStep(index, 'suggested_topics', val)}
                         accessibilityLabel="Step suggested topics list" />

                        <Text style={styles.stepInputLabel}>🛑 When to finish this step (e.g. student nods)</Text>
                        <TextInput
                          style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                          multiline
                          value={step.closing_condition || ''}
                          onChangeText={(val) =>  handleUpdateStep(index, 'closing_condition', val)}
                         accessibilityLabel="Step closing condition" />

                        {step.image_filename || step.image_prompt ? (
                          <View style={styles.subStepImageContainer}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={styles.subStepInputLabel}>🖼️ Saved Illustration Image Name</Text>
                              <TouchableOpacity onPress={() =>  {
                                handleUpdateStep(index, 'image_filename', '');
                                handleUpdateStep(index, 'image_prompt', '');
                                handleUpdateStep(index, 'image_url', '');
                              }} accessibilityRole="button" focusable={true} accessibilityLabel={`Clear illustration image slot for step ${index + 1}`}>
                                <Text style={styles.removeSubStepText}>✕ Clear Image</Text>
                              </TouchableOpacity>
                            </View>
                            <TextInput
                              style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                              multiline
                              value={step.image_filename}
                              onChangeText={(val) =>  handleUpdateStep(index, 'image_filename', val)}
                              placeholder="e.g. habitat_design.png"
                              placeholderTextColor="#8F8AA9"
                             accessibilityLabel="Step image filename" />

                            <Text style={styles.subStepInputLabel}>Illustration Drawing Prompt</Text>
                            <TextInput
                              style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                              multiline
                              value={step.image_prompt}
                              onChangeText={(val) =>  handleUpdateStep(index, 'image_prompt', val)}
                              placeholder="A beautiful diagram showing..."
                              placeholderTextColor="#8F8AA9"
                             accessibilityLabel="Step image generation prompt" />
                            {step.image_url ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                                <Image
                                  source={{ uri: step.image_url }}
                                  style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#F4F3F8', borderWidth: 1.5, borderColor: '#E2DFF0' }}
                                  resizeMode="cover"
                                 accessibilityLabel={`Illustration preview for step ${index + 1}: ${step.image_prompt}`} />
                                <Text style={[styles.urlLoadedText, { flex: 1 }]}>✓ Image URL Ready: {step.image_url.substring(0, 30)}...</Text>
                              </View>
                            ) : (
                              <Text style={styles.urlPendingText}>⏳ URL Pending. Generate below.</Text>
                            )}
                          </View>
                        ) : (
                          <TouchableOpacity 
                            style={styles.subStepAddImageBtn}
                            onPress={() =>  {
                              const defaultFilename = `step_${index + 1}_open.png`;
                              handleUpdateStep(index, 'image_filename', defaultFilename);
                              handleUpdateStep(index, 'image_prompt', 'A detailed, colorful illustration...');
                            }}
                           accessibilityRole="button" focusable={true} accessibilityLabel={`Add illustration image slot to step ${index + 1}`}>
                            <Text style={styles.subStepAddImageBtnText}>🖼 ADD IMAGE TO OPEN STEP</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    <TouchableOpacity 
                      style={styles.removeStepBtn}
                      onPress={() =>  handleRemoveStep(index)}
                      activeOpacity={0.7}
                     accessibilityRole="button" focusable={true} accessibilityLabel={`Remove step ${index + 1} from activity plan`}>
                      <Text style={styles.removeStepBtnText}>🗑 REMOVE STEP</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addStepButton} onPress={handleAddStep} activeOpacity={0.8} accessibilityRole="button" focusable={true} accessibilityLabel="Append a new empty step to the activity plan">
                <Text style={styles.addStepButtonText}>➕ APPEND NEW STEP</Text>
              </TouchableOpacity>
            </View>

          {/* DALL-E image suite */}
          {currentPlan.activity_title && getPlanImages().length > 0 && (
            <View style={styles.card}>
              <View style={[styles.cardHeaderAccent, { backgroundColor: '#FFD33D' }]} />
              <Text style={styles.cardSectionTitle}>C. Educational Illustrations (DALL-E 3)</Text>

              {/* Image Size Selector */}
              <View style={styles.imageSizeSelectorRow}>
                <Text style={styles.inputLabel}>DALL-E Image Size (HQ vs. Fast)</Text>
                <View style={styles.segmentedContainerSize}>
                  {(['1024x1024', '512x512', '256x256'] as const).map((size) => {
                    const isActive = selectedImageSize === size;
                    return (
                      <TouchableOpacity
                        key={size}
                        style={[styles.segmentButtonSize, isActive && styles.segmentButtonActiveSize]}
                        onPress={() =>  setSelectedImageSize(size)}
                        activeOpacity={0.8}
                       accessibilityRole="tab" focusable={true} accessibilityLabel={`Set generated image size to ${size}`} accessibilityState={{ selected: isActive }}>
                        <Text style={[styles.segmentTextSize, isActive && styles.segmentTextActiveSize]}>
                          {size === '1024x1024' ? '1024x1024 (HQ)' : size === '512x512' ? '512x512 (Mid)' : '256x256 (Fast)'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Visual assets referenced in the plan:</Text>
              
              {getPlanImages().map((img) => {
                const uniqueKey = img.subStepIndex !== undefined ? `step-${img.stepIndex}-sub-${img.subStepIndex}` : `step-${img.stepIndex}`;
                const isGenerating = generatingImages[uniqueKey];
                
                return (
                  <View key={img.key} style={styles.imageAssetRow}>
                    <View style={styles.imageAssetInfo}>
                      <Text style={styles.imageAssetFilename}>📁 {img.filename}</Text>
                      <Text style={styles.imageAssetStep}>
                        Step {img.stepIndex + 1} {img.subStepIndex !== undefined ? `(Sub-step ${img.subStepIndex + 1})` : '(Open Step)'}
                      </Text>
                      <TextInput
                        style={[styles.input, styles.imageAssetPromptInput]}
                        multiline
                        value={img.prompt}
                        onChangeText={(val) =>  {
                          if (img.subStepIndex !== undefined) {
                            handleUpdateSubStep(img.stepIndex, img.subStepIndex, 'image_prompt', val);
                          } else {
                            handleUpdateStep(img.stepIndex, 'image_prompt', val);
                          }
                        }}
                        placeholder="Image prompt..."
                        placeholderTextColor="#8F8AA9"
                       accessibilityLabel="Image asset generation prompt" />
                      {img.url ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                          <Image 
                            source={{ uri: img.url }} 
                            style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#F4F3F8', borderWidth: 1.5, borderColor: '#E2DFF0' }} 
                            resizeMode="cover"
                           accessibilityLabel={`DALL-E generated illustration: ${img.prompt}`} />
                          <Text style={[styles.imageAssetUrl, { flex: 1 }]} numberOfLines={1}>🔗 {img.url}</Text>
                        </View>
                      ) : (
                        <Text style={styles.imageAssetStatusPending}>⏳ Awaiting Generation</Text>
                      )}
                    </View>
                    
                    <View style={styles.imageAssetActions}>
                      {isGenerating ? (
                        <View style={styles.imageAssetBtnDisabled}>
                          <ActivityIndicator size="small" color="#FFD33D" />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.imageAssetBtn, img.url && styles.imageAssetBtnRegen]}
                          onPress={() =>  generateImageFor(img)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          focusable={true}
                          accessibilityLabel={img.url ? `Regenerate illustration for ${img.filename}` : `Generate illustration for ${img.filename}`}
                        >
                          <Text style={[styles.imageAssetBtnText, img.url && { color: '#FFD33D' }]}>
                            {img.url ? '🔄 REGEN' : '🎨 GEN'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <View style={styles.divider} />
              
              {isGeneratingAll ? (
                <View style={[styles.connectButton, styles.buttonDisabled]}>
                  <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                  <Text style={styles.buttonText}>GENERATING ASSETS...</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.connectButton, { backgroundColor: '#FFD33D', shadowColor: '#FFD33D' }]} 
                  onPress={generateAllImages} 
                  activeOpacity={0.85}
                 accessibilityRole="button" focusable={true} accessibilityLabel="Generate all missing plan illustrations using DALL-E">
                  <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>🖼 GENERATE ALL MISSING IMAGES</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Sync Card */}
          <View style={styles.card}>
              <View style={[styles.cardHeaderAccent, { backgroundColor: '#A000FF' }]} />
              <Text style={styles.cardSectionTitle}>D. Deploy & Sync to Robot</Text>

              <View style={styles.actionsRow}>
                {isSavingPlan ? (
                  <View style={[styles.syncButton, styles.buttonDisabled, { flex: 1 }]}>
                    <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>STORING...</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[styles.syncButton, { flex: 1 }]} 
                    onPress={savePlanToRobot} 
                    activeOpacity={0.8}
                   accessibilityRole="button" focusable={true} accessibilityLabel="Save activity plan to Gigi robot">
                    <Text style={styles.buttonText}>💾 SAVE TO ROBOT</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.runPlanButton,
                    !plannedFolder && styles.buttonDisabled,
                    { flex: 1, marginLeft: 12 }
                  ]}
                  disabled={!plannedFolder}
                  onPress={runActivityPlan}
                  activeOpacity={0.8}
                 accessibilityRole="button" focusable={true} accessibilityLabel="Execute activity plan on robot" accessibilityState={{ disabled: !plannedFolder }}>
                  <Text style={styles.buttonText}>🚀 RUN PLAN</Text>
                </TouchableOpacity>
              </View>

              {!plannedFolder && (
                <Text style={styles.planSyncHint}>
                  ⚠️ Save the plan to Gigi to unlock the execution controls.
                </Text>
              )}
            </View>
            </>
          ) : (
            <View style={styles.card}>
              <View style={[styles.cardHeaderAccent, { backgroundColor: '#00FF66' }]} />
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No activity plan loaded.</Text>
                <Text style={styles.emptySubText}>Describe an activity above and press Generate to begin.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'interaction' ? (
        renderInteractionPlanner()
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
        >
          {renderManagerPanel()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9F8FD',
  },
  container: {
    flex: 1,
    backgroundColor: '#F9F8FD',
  },
  scrollView: {
    flex: 1,
  },
  hudBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2DFF0',
    backgroundColor: '#FFFFFF',
  },
  hudTitleContainer: {
    flexDirection: 'column',
    flexShrink: 1,
    marginRight: 8,
  },
  hudTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2A2738',
    letterSpacing: 0.5,
  },
  hudSubTitle: {
    fontSize: 13,
    color: '#5E43F3',
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  statusBadgeConnected: {
    backgroundColor: '#E3FAF0',
    borderColor: '#A3EAD0',
  },
  statusBadgeConnecting: {
    backgroundColor: '#FFF1E6',
    borderColor: '#FFD8B3',
  },
  statusBadgeDisconnected: {
    backgroundColor: '#FFEBEF',
    borderColor: '#FFCCD6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusDotConnected: {
    backgroundColor: '#00875A',
  },
  statusDotConnecting: {
    backgroundColor: '#D97706',
  },
  statusDotDisconnected: {
    backgroundColor: '#DE350B',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusLabelConnected: {
    color: '#00875A',
  },
  statusLabelConnecting: {
    color: '#D97706',
  },
  statusLabelDisconnected: {
    color: '#DE350B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 22,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  cardHeaderAccent: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  cardSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2738',
    letterSpacing: 0.5,
    marginBottom: 16,
    marginTop: 2,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F4F3F8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#5E43F3',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E43F3',
    letterSpacing: 0.5,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inputsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#4E4B66',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F4F3F8',
    borderRadius: 12,
    color: '#2A2738',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#D1CCE6',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  bluetoothGroup: {
    marginBottom: 16,
  },
  scanButtonFull: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5E43F3',
    backgroundColor: '#F3F0FC',
    alignItems: 'center',
  },
  scanButtonDisabled: {
    borderColor: '#B6AEE6',
    backgroundColor: '#F4F3F8',
    opacity: 0.6,
  },
  scanningLoaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#5E43F3',
    fontSize: 16,
    fontWeight: '700',
  },
  deviceList: {
    marginTop: 12,
    backgroundColor: '#F4F3F8',
    borderRadius: 14,
    padding: 8,
  },
  deviceItem: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  deviceItemSelected: {
    borderColor: '#5E43F3',
    backgroundColor: '#F3F0FC',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deviceIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  deviceInfoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2738',
  },
  deviceAddress: {
    fontSize: 13,
    color: '#706B8E',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#706B8E',
    textAlign: 'center',
  },
  loadingScriptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  connectButton: {
    backgroundColor: '#5E43F3',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectButton: {
    backgroundColor: '#DE350B',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    backgroundColor: '#D1CCE6',
    opacity: 0.8,
  },
  errorContainer: {
    backgroundColor: '#FFEBEF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FFCCD6',
  },
  errorText: {
    color: '#DE350B',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1.5,
    backgroundColor: '#E2DFF0',
    marginVertical: 18,
  },
  pingButton: {
    backgroundColor: '#F4F3F8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1CCE6',
  },
  pingButtonText: {
    color: '#5E43F3',
    fontSize: 15,
    fontWeight: '700',
  },
  scriptListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  scriptChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F4F3F8',
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  scriptChipSelected: {
    backgroundColor: '#5E43F3',
    borderColor: '#5E43F3',
  },
  scriptChipText: {
    color: '#5E43F3',
    fontSize: 14,
    fontWeight: '600',
  },
  scriptChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  runButton: {
    backgroundColor: '#5E43F3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  stopButton: {
    backgroundColor: '#DE350B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  runningBadge: {
    backgroundColor: '#FFEBEF',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFCCD6',
  },
  runningText: {
    color: '#DE350B',
    fontSize: 14,
    fontWeight: '700',
  },
  consoleToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F4F3F8',
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  filterChipActive: {
    backgroundColor: '#5E43F3',
    borderColor: '#5E43F3',
  },
  filterChipText: {
    fontSize: 12,
    color: '#5E43F3',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  flushButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFEBEF',
    borderWidth: 1.5,
    borderColor: '#FFCCD6',
  },
  clearText: {
    fontSize: 12,
    color: '#DE350B',
    fontWeight: '700',
  },
  consoleContainer: {
    backgroundColor: '#F4F3F8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
    minHeight: 250,
  },
  consoleScrollView: {
    flex: 1,
  },
  consoleEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  consolePlaceholder: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4E4B66',
    marginBottom: 6,
  },
  consoleSubPlaceholder: {
    fontSize: 13,
    color: '#706B8E',
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  logInfo: {
    color: '#0052CC',
  },
  logSuccess: {
    color: '#00875A',
  },
  logError: {
    color: '#DE350B',
  },
  logRaw: {
    color: '#4E4B66',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: '#E2DFF0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#5E43F3',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4E4B66',
  },
  tabButtonTextActive: {
    color: '#5E43F3',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  exampleHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4E4B66',
    marginBottom: 10,
  },
  exampleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  exampleChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F3F0FC',
    borderWidth: 1.5,
    borderColor: '#D1CCE6',
  },
  exampleChipText: {
    fontSize: 14,
    color: '#5E43F3',
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metaCol: {
    flex: 1,
  },
  emptySubText: {
    fontSize: 13,
    color: '#706B8E',
    marginTop: 6,
  },
  stepItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  stepItemCanned: {
    borderLeftWidth: 6,
    borderLeftColor: '#5E43F3',
  },
  stepItemOpen: {
    borderLeftWidth: 6,
    borderLeftColor: '#00875A',
  },
  stepItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  stepBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepIndexText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2738',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCanned: {
    backgroundColor: '#F3F0FC',
  },
  badgeOpen: {
    backgroundColor: '#E3FAF0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepTypeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F4F3F8',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  stepTypeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepTypeToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stepTypeToggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2A2738',
  },
  stepItemBody: {
    marginTop: 8,
  },
  stepInputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4E4B66',
    marginTop: 10,
    marginBottom: 6,
  },
  removeStepBtn: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEF',
  },
  removeStepBtnText: {
    color: '#DE350B',
    fontSize: 13,
    fontWeight: '700',
  },
  addStepButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5E43F3',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  addStepButtonText: {
    color: '#5E43F3',
    fontSize: 15,
    fontWeight: '700',
  },
  syncButton: {
    backgroundColor: '#00875A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runPlanButton: {
    backgroundColor: '#5E43F3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSyncHint: {
    fontSize: 13,
    color: '#706B8E',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  subStepCard: {
    backgroundColor: '#F4F3F8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  subStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subStepIndexText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2738',
  },
  removeSubStepText: {
    color: '#DE350B',
    fontSize: 13,
    fontWeight: '700',
  },
  subStepInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4E4B66',
    marginTop: 8,
    marginBottom: 4,
  },
  subStepTextInput: {
    fontSize: 15,
    paddingVertical: 8,
  },
  subStepRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  subStepCol: {
    flex: 1,
  },
  subStepImageContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  urlLoadedText: {
    color: '#00875A',
    fontSize: 13,
    fontWeight: '600',
  },
  urlPendingText: {
    color: '#706B8E',
    fontSize: 13,
    marginTop: 8,
  },
  subStepAddImageBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5E43F3',
    backgroundColor: '#F3F0FC',
    alignItems: 'center',
  },
  subStepAddImageBtnText: {
    color: '#5E43F3',
    fontSize: 13,
    fontWeight: '700',
  },
  addSubStepBtn: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#5E43F3',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 8,
  },
  addSubStepBtnText: {
    color: '#5E43F3',
    fontSize: 14,
    fontWeight: '700',
  },
  imageAssetRow: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
    alignItems: 'center',
    gap: 12,
  },
  imageAssetInfo: {
    flex: 1,
  },
  imageAssetFilename: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2738',
  },
  imageAssetStep: {
    fontSize: 13,
    color: '#706B8E',
    marginTop: 2,
  },
  imageAssetPromptInput: {
    fontSize: 14,
    marginTop: 8,
    minHeight: 50,
  },
  imageAssetUrl: {
    fontSize: 12,
    color: '#00875A',
    marginTop: 4,
  },
  imageAssetStatusPending: {
    fontSize: 13,
    color: '#706B8E',
    marginTop: 4,
  },
  imageAssetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  imageAssetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#5E43F3',
  },
  imageAssetBtnRegen: {
    backgroundColor: '#F3F0FC',
    borderWidth: 1.5,
    borderColor: '#5E43F3',
  },
  imageAssetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  imageAssetBtnDisabled: {
    backgroundColor: '#D1CCE6',
  },
  imageSizeSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  segmentedContainerSize: {
    flexDirection: 'row',
    backgroundColor: '#F4F3F8',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
  },
  segmentButtonSize: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  segmentButtonActiveSize: {
    backgroundColor: '#5E43F3',
  },
  segmentTextSize: {
    fontSize: 12,
    color: '#5E43F3',
    fontWeight: '600',
  },
  segmentTextActiveSize: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#F9F8FD',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#E2DFF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  authEmoji: {
    fontSize: 48,
    marginBottom: 14,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2A2738',
    marginBottom: 6,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#706B8E',
    textAlign: 'center',
    marginBottom: 20,
  },
  authInput: {
    width: '100%',
    backgroundColor: '#F4F3F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1CCE6',
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
    color: '#2A2738',
    marginBottom: 12,
  },
  authErrorText: {
    color: '#DE350B',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  authBtn: {
    width: '100%',
    backgroundColor: '#5E43F3',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  authBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
