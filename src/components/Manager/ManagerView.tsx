import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { styles } from '../../styles/theme';
import { QRCodeDisplay } from '../Common/QRCodeDisplay';
import { IssuedToken } from '../../types';
import { getAdminPasscode, setAdminPasscode } from '../../utils/crypto';

export interface ManagerViewProps {
  adminApiKey: string;
  handleSaveAdminApiKey: (key: string) => void;
  setDecryptedApiKey?: (key: string) => void;
  newUserName: string;
  setNewUserName: (name: string) => void;
  newUserExpiration: string;
  setNewUserExpiration: (exp: string) => void;
  generatedToken: string;
  generateUserToken: () => void;
  issuedTokens: IssuedToken[];
  blacklist: string[];
  handleToggleBlacklist: (username: string) => void;
  copyToClipboard: (text: string) => void;
  activeQrUser: string | null;
  setActiveQrUser: (user: string | null) => void;
  exportBackup: () => void;
  importBackup: () => void;
}

export const ManagerView: React.FC<ManagerViewProps> = ({
  adminApiKey,
  handleSaveAdminApiKey,
  setDecryptedApiKey,
  newUserName,
  setNewUserName,
  newUserExpiration,
  setNewUserExpiration,
  generatedToken,
  generateUserToken,
  issuedTokens,
  blacklist,
  handleToggleBlacklist,
  copyToClipboard,
  activeQrUser,
  setActiveQrUser,
  exportBackup,
  importBackup,
}) => {
  const [customPasscode, setCustomPasscode] = useState(getAdminPasscode());
  const [passcodeSavedMsg, setPasscodeSavedMsg] = useState(false);

  const handleUpdatePasscode = () => {
    if (customPasscode.trim()) {
      setAdminPasscode(customPasscode.trim());
      setPasscodeSavedMsg(true);
      setTimeout(() => setPasscodeSavedMsg(false), 3000);
    }
  };

  return (
    <View style={{ gap: 18 }}>
      {/* Azure API Key Configuration Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#FF9900' }]} />
        <Text style={styles.cardSectionTitle}>🔑 Azure OpenAI API Key Settings</Text>
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

      {/* Admin Passcode Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#00C853' }]} />
        <Text style={styles.cardSectionTitle}>🔒 Admin Master Passcode</Text>
        <Text style={{ color: '#706B8E', fontSize: 14, marginTop: 6, lineHeight: 20 }}>
          Customize your local administrator passcode used to unlock this system.
        </Text>

        <View style={{ marginTop: 12, marginBottom: 12 }}>
          <Text style={styles.inputLabel}>Admin Passcode</Text>
          <TextInput
            style={styles.input}
            value={customPasscode}
            onChangeText={setCustomPasscode}
            placeholder="Enter new admin passcode"
            placeholderTextColor="#8F8AA9"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity style={styles.connectButton} onPress={handleUpdatePasscode} activeOpacity={0.85}>
          <Text style={styles.buttonText}>UPDATE ADMIN PASSCODE</Text>
        </TouchableOpacity>
        {passcodeSavedMsg && (
          <Text style={{ color: '#00C853', fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' }}>
            ✓ Admin passcode saved successfully!
          </Text>
        )}
      </View>

      {/* Issue Token Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
        <Text style={styles.cardSectionTitle}>🎫 Issue New User Token</Text>
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
        <Text style={styles.cardSectionTitle}>📊 Active Users & Usage Logs</Text>
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
                        {item.username.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: '#ECE9F5', paddingTop: 12 }}>
          <TouchableOpacity
            onPress={exportBackup}
            style={{ flex: 1, backgroundColor: '#F4F3F8', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1CCE6', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, color: '#5E43F3', fontWeight: '700' }}>📤 Export Tokens Backup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={importBackup}
            style={{ flex: 1, backgroundColor: '#F4F3F8', paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D1CCE6', alignItems: 'center' }}
          >
            <Text style={{ fontSize: 11, color: '#5E43F3', fontWeight: '700' }}>📥 Import Tokens Backup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Revoke Access Card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#DE350B' }]} />
        <Text style={styles.cardSectionTitle}>🚫 Revoke User Access (Manual Search)</Text>
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
          <Text style={{ color: '#706B8E', fontStyle: 'italic', fontSize: 13 }}>
            No accounts currently revoked.
          </Text>
        )}
      </View>
    </View>
  );
};

export default ManagerView;
