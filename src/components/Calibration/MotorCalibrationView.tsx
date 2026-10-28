import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import {
  ConnectionStatus,
  MotorJointName,
  MotorJointConfig,
  MotorCalibrationMap,
  CalibrationStatusInfo,
  ChannelScanResult,
} from '../../types';

export interface MotorCalibrationViewProps {
  connectionStatus: ConnectionStatus;
  isRobotCalibrated: boolean | null;
  calibrationStatusInfo: CalibrationStatusInfo | null;
  motorCalibration: MotorCalibrationMap | null;
  isSavingCalibration: boolean;
  isTestingGesture: boolean;
  activeGestureName: string | null;
  isScanningChannels?: boolean;
  scanProgressChannel?: number | null;
  channelScanResult?: ChannelScanResult | null;
  onFetchCalibration: () => void;
  onMoveChannelPwm: (channel: number, pwm: number, joint?: MotorJointName) => void;
  onWiggleChannel: (channel: number, basePwm?: number) => void;
  onScanChannels?: () => void;
  onHomeMotors: (customMotors?: MotorCalibrationMap) => void;
  onReleaseMotors: () => void;
  onTestGesture: (gestureName: string, customMotors?: MotorCalibrationMap) => void;
  onSaveCalibration: (motors: MotorCalibrationMap) => void;
  onRunVoiceCalibrationWizard: () => void;
}

interface JointMeta {
  key: MotorJointName;
  label: string;
  icon: string;
  required: boolean;
  defaultChannel: number;
  defaultDirection: string;
  description: string;
  minGuide: string;
  centerGuide: string;
  maxGuide: string;
}

export const JOINT_METADATA: JointMeta[] = [
  {
    key: 'neck',
    label: 'Neck (Head Pan)',
    icon: '🗣️',
    required: true,
    defaultChannel: 1,
    defaultDirection: 'left',
    description: 'Rotates Gigi’s head horizontally from right to left.',
    minGuide: 'Looking comfortably to the Right (~200–275 PWM)',
    centerGuide: 'Looking straight forward (~275–400 PWM)',
    maxGuide: 'Looking comfortably to the Left (~350–525 PWM)',
  },
  {
    key: 'torso',
    label: 'Torso (Waist Pan)',
    icon: '🧍',
    required: true,
    defaultChannel: 0,
    defaultDirection: 'left',
    description: 'Rotates Gigi’s upper body horizontally around the base.',
    minGuide: 'Turned comfortably to the Right (~200–300 PWM)',
    centerGuide: 'Facing straight forward (~300–400 PWM)',
    maxGuide: 'Turned comfortably to the Left (~400–500 PWM)',
  },
  {
    key: 'left_shoulder',
    label: 'Left Shoulder',
    icon: '💪',
    required: true,
    defaultChannel: 2,
    defaultDirection: 'down',
    description: 'Raises and lowers Gigi’s left arm.',
    minGuide: 'Left arm raised UP safely (~200 PWM)',
    centerGuide: 'Neutral resting pose (~300–325 PWM)',
    maxGuide: 'Left arm lowered DOWN by side (~375–400 PWM)',
  },
  {
    key: 'right_shoulder',
    label: 'Right Shoulder',
    icon: '🦾',
    required: true,
    defaultChannel: 3,
    defaultDirection: 'up',
    description: 'Raises and lowers Gigi’s right arm (mirrored orientation).',
    minGuide: 'Right arm lowered DOWN by side (~75–100 PWM)',
    centerGuide: 'Neutral resting pose (~150–175 PWM)',
    maxGuide: 'Right arm raised UP safely (~300–325 PWM)',
  },
  {
    key: 'left_elbow',
    label: 'Left Elbow',
    icon: '🤛',
    required: false,
    defaultChannel: 15,
    defaultDirection: 'in',
    description: 'Swings the left forearm inward and outward for waving/clapping.',
    minGuide: 'Forearm swung OUT (~275–300 PWM)',
    centerGuide: 'Forearm neutral middle (~300–325 PWM)',
    maxGuide: 'Forearm swung IN (~325–340 PWM)',
  },
  {
    key: 'right_elbow',
    label: 'Right Elbow',
    icon: '🤜',
    required: false,
    defaultChannel: 14,
    defaultDirection: 'out',
    description: 'Swings the right forearm inward and outward for waving/clapping.',
    minGuide: 'Forearm swung IN (~310–325 PWM)',
    centerGuide: 'Forearm neutral middle (~325–350 PWM)',
    maxGuide: 'Forearm swung OUT (~345–375 PWM)',
  },
];

export const DEFAULT_MOTOR_CALIBRATION_MAP: MotorCalibrationMap = {
  neck: { channel: 1, min: 275, max: 525, center: 400, calibrated: true, direction: 'left' },
  torso: { channel: 0, min: 300, max: 500, center: 400, calibrated: true, direction: 'left' },
  left_shoulder: { channel: 2, min: 200, max: 375, center: 325, calibrated: true, direction: 'down' },
  right_shoulder: { channel: 3, min: 100, max: 325, center: 175, calibrated: true, direction: 'up' },
  left_elbow: { channel: 15, min: 300, max: 340, center: 325, calibrated: true, direction: 'in' },
  right_elbow: { channel: 14, min: 310, max: 345, center: 325, calibrated: true, direction: 'out' },
};

const ALL_CHANNELS = Array.from({ length: 16 }, (_, i) => i);

export const MotorCalibrationView: React.FC<MotorCalibrationViewProps> = ({
  connectionStatus,
  isRobotCalibrated,
  calibrationStatusInfo,
  motorCalibration,
  isSavingCalibration,
  isTestingGesture,
  activeGestureName,
  isScanningChannels = false,
  scanProgressChannel = null,
  channelScanResult = null,
  onFetchCalibration,
  onMoveChannelPwm,
  onWiggleChannel,
  onScanChannels,
  onHomeMotors,
  onReleaseMotors,
  onTestGesture,
  onSaveCalibration,
  onRunVoiceCalibrationWizard,
}) => {
  const [draftMotors, setDraftMotors] = useState<MotorCalibrationMap>(
    motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP
  );
  const [selectedJoint, setSelectedJoint] = useState<MotorJointName>('neck');
  const [livePwmByJoint, setLivePwmByJoint] = useState<Record<MotorJointName, number>>({
    neck: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).neck?.center || 300,
    torso: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).torso?.center || 300,
    left_shoulder: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).left_shoulder?.center || 300,
    right_shoulder: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).right_shoulder?.center || 200,
    left_elbow: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).left_elbow?.center || 325,
    right_elbow: (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).right_elbow?.center || 325,
  });
  const [manualPwmInput, setManualPwmInput] = useState<string>(
    String((motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).neck?.center || 300)
  );
  const [probeChannel, setProbeChannel] = useState<number>(
    (motorCalibration || DEFAULT_MOTOR_CALIBRATION_MAP).neck?.channel ?? 1
  );
  const [showChannelScanner, setShowChannelScanner] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  useEffect(() => {
    if (motorCalibration) {
      setDraftMotors(motorCalibration);
      setHasUnsavedChanges(false);
      setLivePwmByJoint({
        neck: motorCalibration.neck?.center ?? 300,
        torso: motorCalibration.torso?.center ?? 300,
        left_shoulder: motorCalibration.left_shoulder?.center ?? 300,
        right_shoulder: motorCalibration.right_shoulder?.center ?? 200,
        left_elbow: motorCalibration.left_elbow?.center ?? 325,
        right_elbow: motorCalibration.right_elbow?.center ?? 325,
      });
      const activeJointCfg = motorCalibration[selectedJoint];
      if (activeJointCfg) {
        setManualPwmInput(String(activeJointCfg.center ?? 300));
        setProbeChannel(activeJointCfg.channel ?? 0);
      }
    }
  }, [motorCalibration]);

  const currentMeta = JOINT_METADATA.find((j) => j.key === selectedJoint) || JOINT_METADATA[0];
  const currentConfig: MotorJointConfig = draftMotors[selectedJoint] || {
    channel: currentMeta.defaultChannel,
    min: 200,
    max: 400,
    center: 300,
    calibrated: false,
    direction: currentMeta.defaultDirection,
  };
  const currentPwm = livePwmByJoint[selectedJoint] ?? currentConfig.center ?? 300;

  useEffect(() => {
    if (channelScanResult && channelScanResult.active_channels.length > 0) {
      setShowChannelScanner(true);
    }
  }, [channelScanResult]);

  useEffect(() => {
    const targetPwm = livePwmByJoint[selectedJoint] ?? currentConfig.center ?? 300;
    setManualPwmInput(String(targetPwm));
    setProbeChannel(currentConfig.channel);
  }, [selectedJoint, currentConfig.channel, currentConfig.center, livePwmByJoint]);

  const handleApplySuggestedChannels = () => {
    if (!channelScanResult?.suggested_assignments) return;
    setHasUnsavedChanges(true);
    setDraftMotors((prev) => {
      const next = { ...prev };
      (Object.keys(channelScanResult.suggested_assignments) as MotorJointName[]).forEach((jKey) => {
        const suggestedCh = channelScanResult.suggested_assignments[jKey];
        if (typeof suggestedCh === 'number' && suggestedCh >= 0 && suggestedCh <= 15) {
          const existing = next[jKey] || DEFAULT_MOTOR_CALIBRATION_MAP[jKey];
          next[jKey] = {
            ...existing,
            channel: suggestedCh,
          };
        }
      });
      return next;
    });
  };

  const handleSwapLeftRightArms = () => {
    setHasUnsavedChanges(true);
    setDraftMotors((prev) => {
      const leftSh = prev.left_shoulder || DEFAULT_MOTOR_CALIBRATION_MAP.left_shoulder;
      const rightSh = prev.right_shoulder || DEFAULT_MOTOR_CALIBRATION_MAP.right_shoulder;
      const leftEl = prev.left_elbow || DEFAULT_MOTOR_CALIBRATION_MAP.left_elbow;
      const rightEl = prev.right_elbow || DEFAULT_MOTOR_CALIBRATION_MAP.right_elbow;
      return {
        ...prev,
        left_shoulder: { ...leftSh, channel: rightSh.channel },
        right_shoulder: { ...rightSh, channel: leftSh.channel },
        left_elbow: { ...leftEl, channel: rightEl.channel },
        right_elbow: { ...rightEl, channel: leftEl.channel },
      };
    });
  };

  const clampPwm = (val: number) => Math.max(50, Math.min(600, Math.round(val)));

  const updateJointField = (joint: MotorJointName, patch: Partial<MotorJointConfig>) => {
    setHasUnsavedChanges(true);
    setDraftMotors((prev) => {
      const existing = prev[joint] || DEFAULT_MOTOR_CALIBRATION_MAP[joint];
      return {
        ...prev,
        [joint]: {
          ...existing,
          ...patch,
          calibrated: patch.calibrated !== undefined ? patch.calibrated : true,
        },
      };
    });
  };

  const commandJointPwm = (nextPwm: number) => {
    const safePwm = clampPwm(nextPwm);
    setLivePwmByJoint((prev) => ({ ...prev, [selectedJoint]: safePwm }));
    setManualPwmInput(String(safePwm));
    onMoveChannelPwm(currentConfig.channel, safePwm, selectedJoint);
  };

  const handleNudge = (delta: number) => {
    commandJointPwm(currentPwm + delta);
  };

  const normalizeJointLimits = (rawMin: number, rawCenter: number, rawMax: number) => {
    const safeMin = Math.max(50, Math.min(590, clampPwm(rawMin)));
    const safeMax = Math.max(safeMin + 10, Math.min(600, clampPwm(rawMax)));
    const safeCenter = Math.max(safeMin, Math.min(safeMax, clampPwm(rawCenter)));
    return { min: safeMin, center: safeCenter, max: safeMax };
  };

  const handleSetMin = () => {
    const newMin = Math.min(590, clampPwm(currentPwm));
    const nextLimits = normalizeJointLimits(newMin, currentConfig.center, Math.max(newMin + 10, currentConfig.max));
    updateJointField(selectedJoint, {
      ...nextLimits,
      calibrated: true,
    });
  };

  const handleSetCenter = () => {
    const newCenter = clampPwm(currentPwm);
    const candidateMin = Math.min(currentConfig.min, newCenter);
    const candidateMax = Math.max(currentConfig.max, newCenter, candidateMin + 10);
    const nextLimits = normalizeJointLimits(candidateMin, newCenter, candidateMax);
    updateJointField(selectedJoint, {
      ...nextLimits,
      calibrated: true,
    });
  };

  const handleSetMax = () => {
    const newMax = Math.max(60, clampPwm(currentPwm));
    const nextLimits = normalizeJointLimits(Math.min(newMax - 10, currentConfig.min), currentConfig.center, newMax);
    updateJointField(selectedJoint, {
      ...nextLimits,
      calibrated: true,
    });
  };

  const handleAutoMidpointCenter = () => {
    const mid = clampPwm(Math.round((currentConfig.min + currentConfig.max) / 2));
    updateJointField(selectedJoint, { center: mid, calibrated: true });
    commandJointPwm(mid);
  };

  const handleConfirmSave = () => {
    const nextMap: MotorCalibrationMap = { ...draftMotors };
    JOINT_METADATA.forEach((meta) => {
      const existing = nextMap[meta.key] || DEFAULT_MOTOR_CALIBRATION_MAP[meta.key];
      const normalized = normalizeJointLimits(existing.min, existing.center, existing.max);
      const isDummy = normalized.min === 290 && normalized.max === 310;
      nextMap[meta.key] = {
        ...existing,
        ...normalized,
        calibrated: Boolean(existing.calibrated && !isDummy),
        direction: existing.direction || meta.defaultDirection,
      };
    });
    setDraftMotors(nextMap);
    setHasUnsavedChanges(false);
    onSaveCalibration(nextMap);
  };

  // Channel collision detector
  const channelOwners: Record<number, string[]> = {};
  JOINT_METADATA.forEach((meta) => {
    const ch = draftMotors[meta.key]?.channel;
    if (typeof ch === 'number') {
      if (!channelOwners[ch]) channelOwners[ch] = [];
      channelOwners[ch].push(meta.label);
    }
  });
  const duplicateChannels = Object.entries(channelOwners).filter(([, owners]) => owners.length > 1);

  if (connectionStatus !== 'connected') {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#F59E0B' }]} />
          <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
            🔧 Interactive Motor Calibration Studio
          </Text>
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>🔌</Text>
            <Text style={styles.emptyText}>Gigi is Offline</Text>
            <Text style={[styles.emptySubText, { textAlign: 'center', marginTop: 4 }]}>
              Please connect to Gigi via Bluetooth in the "Chat & Manual Control" tab first to jog servos, discover channels, and save motor calibration.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Compute visual bar percentages (within 50..600 hardware domain)
  const domainMin = 50;
  const domainMax = 600;
  const toPct = (val: number) =>
    Math.max(0, Math.min(100, ((val - domainMin) / (domainMax - domainMin)) * 100));

  const minPct = toPct(currentConfig.min);
  const maxPct = toPct(currentConfig.max);
  const centerPct = toPct(currentConfig.center);
  const livePct = toPct(currentPwm);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Status & Safety Bar Card */}
      <View style={styles.card}>
        <View
          style={[
            styles.cardHeaderAccent,
            { backgroundColor: isRobotCalibrated ? '#00875A' : '#D97706' },
          ]}
        />
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text accessibilityRole="header" aria-level={2} style={[styles.cardSectionTitle, { marginBottom: 4 }]}>
              🔧 Interactive Motor Calibration Studio
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', lineHeight: 17 }}>
              Jog PCA9685 servo channels in real time, wiggle channels to identify wiring, capture Min / Center / Max limits, and save directly to Gigi.
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={onFetchCalibration}
              style={{
                backgroundColor: '#F1F5F9',
                borderWidth: 1,
                borderColor: '#CBD5E1',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Reload calibration from robot"
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>🔄 Reload from Robot</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onHomeMotors(draftMotors)}
              style={{
                backgroundColor: '#EFF6FF',
                borderWidth: 1,
                borderColor: '#93C5FD',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Move all motors to neutral center position"
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D4ED8' }}>🏠 Home All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onReleaseMotors}
              style={{
                backgroundColor: '#FFEBEF',
                borderWidth: 1.5,
                borderColor: '#FFCCD6',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 10,
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Emergency release all motor torque"
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#DE350B' }}>🛑 Release / Relax Motors</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Calibration Status Strip */}
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            backgroundColor: isRobotCalibrated ? '#E3FAF0' : '#FFF4E5',
            borderWidth: 1,
            borderColor: isRobotCalibrated ? '#A3EAD0' : '#FFD8B3',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: isRobotCalibrated ? '#00875A' : '#D97706',
              }}
            >
              {isRobotCalibrated
                ? '🟢 Robot Profile Status: CALIBRATED & UNLOCKED'
                : '⚠️ Robot Profile Status: UNCALIBRATED (Activities Locked)'}
            </Text>
            <Text style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
              {calibrationStatusInfo?.calibrated_at
                ? `Last saved: ${calibrationStatusInfo.calibrated_at}`
                : 'Adjust joints below and click "Save Calibration to Robot" to unlock movement.'}
              {hasUnsavedChanges ? ' • 📝 Unsaved local edits' : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleConfirmSave}
            disabled={isSavingCalibration}
            style={{
              backgroundColor: isSavingCalibration ? '#94A3B8' : '#00875A',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save calibration profile to robot"
          >
            {isSavingCalibration && <ActivityIndicator size="small" color="#FFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
              💾 SAVE CALIBRATION TO ROBOT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Channel Collision Warning */}
        {duplicateChannels.length > 0 && (
          <View
            style={{
              marginTop: 10,
              padding: 10,
              borderRadius: 10,
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
            }}
          >
            {duplicateChannels.map(([ch, owners]) => (
              <Text key={ch} style={{ fontSize: 12, color: '#DC2626', fontWeight: '700' }}>
                ⚠️ Channel Conflict: PCA9685 Channel {ch} is assigned to multiple joints ({owners.join(', ')}).
              </Text>
            ))}
          </View>
        )}
      </View>

      {/* Step 1: Select Joint & Channel Discovery */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5E43F3' }]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <Text accessibilityRole="header" aria-level={2} style={[styles.cardSectionTitle, { marginBottom: 0 }]}>
            1. Select Joint to Calibrate
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {onScanChannels && (
              <TouchableOpacity
                onPress={() => {
                  setShowChannelScanner(true);
                  onScanChannels();
                }}
                disabled={isScanningChannels || isTestingGesture || isSavingCalibration}
                style={{
                  backgroundColor: isScanningChannels ? '#94A3B8' : '#0284C7',
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
                activeOpacity={0.8}
              >
                {isScanningChannels && <ActivityIndicator size="small" color="#FFF" />}
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFFFFF' }}>
                  {isScanningChannels
                    ? `⏳ Scanning CH ${scanProgressChannel ?? 0}/16...`
                    : '⚡ Auto-Detect Active Channels'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleSwapLeftRightArms}
              style={{
                backgroundColor: '#F0FDF4',
                borderWidth: 1,
                borderColor: '#86EFAC',
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Swap Left and Right arms while keeping each shoulder paired with its same-side elbow"
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>
                ⇄ Swap L↔R Arms (Paired)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowChannelScanner(!showChannelScanner)}
              style={{
                backgroundColor: showChannelScanner ? '#EDE9FE' : '#F8FAFC',
                borderWidth: 1,
                borderColor: showChannelScanner ? '#5E43F3' : '#CBD5E1',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: showChannelScanner ? '#5E43F3' : '#334155' }}>
                {showChannelScanner ? '🔼 Hide 16-Channel Finder' : '🔍 Open 16-Channel Wiring Finder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Optional 16-Channel Wiggle Scanner */}
        {showChannelScanner && (
          <View
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 }}>
              🔍 PCA9685 16-Channel Wiggle & Auto-Detection Scanner
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Click "⚡ Auto-Detect Active Channels" to probe all 16 channels using Gigi’s Torso camera (Torso pan produces the largest motion, followed by Neck, Shoulders, and Elbows), or tap any channel (0–15) to wiggle and assign it manually.
            </Text>

            {channelScanResult && !isScanningChannels && (
              <View
                style={{
                  backgroundColor: '#ECFDF5',
                  borderWidth: 1,
                  borderColor: '#6EE7B7',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  gap: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 200 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#065F46' }}>
                      🟢 Auto-Detected {channelScanResult.active_channels.length} Active Channels:{' '}
                      {channelScanResult.active_channels.length > 0
                        ? channelScanResult.active_channels.map((c) => `CH ${c}`).join(', ')
                        : 'None'}
                    </Text>
                    {Object.keys(channelScanResult.suggested_assignments || {}).length > 0 && (
                      <Text style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                        Suggested by Torso camera optical flow & arm recoil coupling:{' '}
                        {Object.entries(channelScanResult.suggested_assignments)
                          .map(([j, c]) => `${j} → CH ${c}`)
                          .join(' • ')}
                      </Text>
                    )}
                    {channelScanResult.arm_pairs && channelScanResult.arm_pairs.length > 0 && (
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46', marginTop: 3 }}>
                        🔗 Paired Same-Side Arms (Shoulder + Elbow):{' '}
                        {channelScanResult.arm_pairs
                          .filter(
                            (p): p is NonNullable<typeof p> =>
                              Boolean(p && typeof p.shoulder === 'number' && typeof p.elbow === 'number')
                          )
                          .map(
                            (p) =>
                              `${p.side === 'right' ? 'Right Arm' : 'Left Arm'} [Shoulder CH ${p.shoulder} + Elbow CH ${p.elbow}]`
                          )
                          .join(' • ')}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {Object.keys(channelScanResult.suggested_assignments || {}).length > 0 && (
                      <TouchableOpacity
                        onPress={handleApplySuggestedChannels}
                        style={{
                          backgroundColor: '#059669',
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 8,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF' }}>
                          ✨ Apply Suggested Channels (Editable)
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={handleSwapLeftRightArms}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#059669',
                        paddingHorizontal: 11,
                        paddingVertical: 7,
                        borderRadius: 8,
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#065F46' }}>
                        ⇄ Swap Left ↔ Right Arms (Keep Paired)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ALL_CHANNELS.map((ch) => {
                const isSelectedProbe = probeChannel === ch;
                const assignedTo = channelOwners[ch]?.join(', ');
                const scanInfo = channelScanResult?.channels?.find((r) => r.channel === ch);
                const isDetectedActive = Boolean(scanInfo?.active);
                return (
                  <TouchableOpacity
                    key={ch}
                    disabled={isScanningChannels}
                    onPress={() => {
                      setProbeChannel(ch);
                      onWiggleChannel(ch, 300);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: isSelectedProbe
                        ? '#5E43F3'
                        : isDetectedActive
                        ? '#10B981'
                        : assignedTo
                        ? '#93C5FD'
                        : '#CBD5E1',
                      backgroundColor: isSelectedProbe
                        ? '#EDE9FE'
                        : isDetectedActive
                        ? '#ECFDF5'
                        : assignedTo
                        ? '#EFF6FF'
                        : '#FFFFFF',
                      minWidth: 74,
                      alignItems: 'center',
                    }}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: isSelectedProbe ? '#5E43F3' : isDetectedActive ? '#065F46' : '#1E293B',
                      }}
                    >
                      CH {ch} {isDetectedActive ? '🟢' : ''}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                      {assignedTo
                        ? assignedTo.split(' ')[0]
                        : isDetectedActive
                        ? `Active (${scanInfo?.mean_diff ?? ''}Δ)`
                        : scanInfo
                        ? 'Empty'
                        : 'Unused'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ fontSize: 12, color: '#334155', fontWeight: '600' }}>
                Last probed: <Text style={{ fontWeight: '800', color: '#5E43F3' }}>Channel {probeChannel}</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => onWiggleChannel(probeChannel, 300)}
                  style={{
                    backgroundColor: '#E0F2FE',
                    borderWidth: 1,
                    borderColor: '#7DD3FC',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>
                    〰️ Wiggle CH {probeChannel} Again
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateJointField(selectedJoint, { channel: probeChannel })}
                  style={{
                    backgroundColor: '#5E43F3',
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    borderRadius: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                    📌 Assign CH {probeChannel} to {currentMeta.label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Joint Selector Pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {JOINT_METADATA.map((meta) => {
            const cfg = draftMotors[meta.key];
            const isSelected = selectedJoint === meta.key;
            const isDummy = cfg && cfg.min === 290 && cfg.max === 310;
            const isDone = cfg?.calibrated && !isDummy;
            return (
              <TouchableOpacity
                key={meta.key}
                onPress={() => setSelectedJoint(meta.key)}
                style={{
                  flex: 1,
                  minWidth: 155,
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isSelected ? '#5E43F3' : isDone ? '#A3EAD0' : '#E2DFF0',
                  backgroundColor: isSelected ? '#F3F0FC' : '#FFFFFF',
                }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{meta.icon}</Text>
                  <View
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 6,
                      backgroundColor: isDone ? '#E3FAF0' : '#FFF4E5',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: isDone ? '#00875A' : '#D97706',
                      }}
                    >
                      CH {cfg?.channel ?? meta.defaultChannel} {isDone ? '✓' : '•'}
                    </Text>
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '800',
                    color: isSelected ? '#5E43F3' : '#1E293B',
                    marginTop: 6,
                  }}
                >
                  {meta.label}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2, fontFamily: 'monospace' }}>
                  {cfg?.min ?? 200} / {cfg?.center ?? 300} / {cfg?.max ?? 400}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Step 2: Active Joint Live Jogger & Limit Capture */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#0284C7' }]} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text accessibilityRole="header" aria-level={2} style={[styles.cardSectionTitle, { marginBottom: 4 }]}>
              2. Tune {currentMeta.icon} {currentMeta.label}
            </Text>
            <Text style={{ fontSize: 12, color: '#475569' }}>{currentMeta.description}</Text>
          </View>

          {/* Channel Selector for this Joint */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>PCA9685 Channel:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TouchableOpacity
                onPress={() =>
                  updateJointField(selectedJoint, {
                    channel: Math.max(0, currentConfig.channel - 1),
                  })
                }
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontWeight: '800', color: '#334155' }}>−</Text>
              </TouchableOpacity>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: '#EFF6FF',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#93C5FD',
                  minWidth: 48,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1D4ED8', fontFamily: 'monospace' }}>
                  {currentConfig.channel}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  updateJointField(selectedJoint, {
                    channel: Math.min(15, currentConfig.channel + 1),
                  })
                }
                style={{
                  backgroundColor: '#F1F5F9',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                }}
              >
                <Text style={{ fontWeight: '800', color: '#334155' }}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => onWiggleChannel(currentConfig.channel, currentConfig.center || 300)}
              style={{
                backgroundColor: '#E0F2FE',
                borderWidth: 1,
                borderColor: '#7DD3FC',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0369A1' }}>〰️ Wiggle Joint</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                updateJointField(selectedJoint, {
                  calibrated: !currentConfig.calibrated,
                })
              }
              style={{
                backgroundColor: currentConfig.calibrated ? '#E3FAF0' : '#FFF4E5',
                borderWidth: 1,
                borderColor: currentConfig.calibrated ? '#A3EAD0' : '#FFD8B3',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              activeOpacity={0.75}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: currentConfig.calibrated ? '#00875A' : '#D97706',
                }}
              >
                {currentConfig.calibrated ? '✅ Joint Verified' : '☑️ Mark Verified'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reference Pose Guide Box */}
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            backgroundColor: '#F8FAFC',
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 2 }}>
            📐 Reference Pose Guide for {currentMeta.label}:
          </Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>
            • <Text style={{ fontWeight: '700', color: '#D97706' }}>MIN Limit:</Text> {currentMeta.minGuide}
          </Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>
            • <Text style={{ fontWeight: '700', color: '#0284C7' }}>CENTER (Home):</Text> {currentMeta.centerGuide}
          </Text>
          <Text style={{ fontSize: 12, color: '#475569' }}>
            • <Text style={{ fontWeight: '700', color: '#7C3AED' }}>MAX Limit:</Text> {currentMeta.maxGuide}
          </Text>
        </View>

        {/* Visual PWM Range Track */}
        <View style={{ marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>50 PWM</Text>
            <Text style={{ fontSize: 13, color: '#0F172A', fontWeight: '800', fontFamily: 'monospace' }}>
              Live Command: {currentPwm} PWM (CH {currentConfig.channel})
            </Text>
            <Text style={{ fontSize: 11, color: '#64748B', fontWeight: '600' }}>600 PWM</Text>
          </View>

          <View
            style={{
              height: 24,
              backgroundColor: '#E2E8F0',
              borderRadius: 12,
              position: 'relative',
              overflow: 'hidden',
              justifyContent: 'center',
            }}
          >
            {/* Active Min..Max Safe Span */}
            <View
              style={{
                position: 'absolute',
                left: `${minPct}%`,
                width: `${Math.max(1, maxPct - minPct)}%`,
                top: 0,
                bottom: 0,
                backgroundColor: '#BFDBFE',
                borderLeftWidth: 3,
                borderLeftColor: '#D97706',
                borderRightWidth: 3,
                borderRightColor: '#7C3AED',
              }}
            />
            {/* Center Marker */}
            <View
              style={{
                position: 'absolute',
                left: `${centerPct}%`,
                top: 0,
                bottom: 0,
                width: 3,
                backgroundColor: '#0284C7',
              }}
            />
            {/* Live PWM Cursor */}
            <View
              style={{
                position: 'absolute',
                left: `${livePct}%`,
                width: 14,
                height: 14,
                borderRadius: 7,
                marginLeft: -7,
                backgroundColor: '#0F172A',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#D97706' }}>
              Min: {currentConfig.min}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284C7' }}>
              Center: {currentConfig.center}
            </Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#7C3AED' }}>
              Max: {currentConfig.max}
            </Text>
          </View>
        </View>

        {/* Live PWM Jog Buttons */}
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 }}>
            Jog Motor Position (Sends immediate PWM to Channel {currentConfig.channel}):
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {[
              { label: '−50', delta: -50, bg: '#FEF2F2', border: '#FCA5A5', text: '#B91C1C' },
              { label: '−25', delta: -25, bg: '#FFF4E5', border: '#FCD34D', text: '#B45309' },
              { label: '−10', delta: -10, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
              { label: '−5', delta: -5, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
              { label: '−1', delta: -1, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={() => handleNudge(btn.delta)}
                style={{
                  backgroundColor: btn.bg,
                  borderColor: btn.border,
                  borderWidth: 1.5,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  minWidth: 54,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: btn.text }}>{btn.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Direct PWM Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TextInput
                value={manualPwmInput}
                onChangeText={setManualPwmInput}
                keyboardType="numeric"
                onSubmitEditing={() => {
                  const parsed = parseInt(manualPwmInput, 10);
                  if (!isNaN(parsed)) commandJointPwm(parsed);
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.5,
                  borderColor: '#5E43F3',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  width: 72,
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: '800',
                  fontFamily: 'monospace',
                  color: '#0F172A',
                }}
              />
              <TouchableOpacity
                onPress={() => {
                  const parsed = parseInt(manualPwmInput, 10);
                  if (!isNaN(parsed)) commandJointPwm(parsed);
                }}
                style={{
                  backgroundColor: '#5E43F3',
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>GO</Text>
              </TouchableOpacity>
            </View>

            {[
              { label: '+1', delta: 1, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
              { label: '+5', delta: 5, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
              { label: '+10', delta: 10, bg: '#F8FAFC', border: '#CBD5E1', text: '#1E293B' },
              { label: '+25', delta: 25, bg: '#EFF6FF', border: '#93C5FD', text: '#1D4ED8' },
              { label: '+50', delta: 50, bg: '#F3E8FF', border: '#D8B4FE', text: '#6D28D9' },
            ].map((btn) => (
              <TouchableOpacity
                key={btn.label}
                onPress={() => handleNudge(btn.delta)}
                style={{
                  backgroundColor: btn.bg,
                  borderColor: btn.border,
                  borderWidth: 1.5,
                  borderRadius: 10,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  minWidth: 54,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14, fontWeight: '800', color: btn.text }}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Capture & Jump Cards for Min / Center / Max */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
          {/* MIN Card */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#FFFBEB',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1.5,
              borderColor: '#FDE68A',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#B45309' }}>MIN LIMIT</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E', fontFamily: 'monospace' }}>
                {currentConfig.min}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSetMin}
              style={{
                backgroundColor: '#D97706',
                paddingVertical: 9,
                borderRadius: 8,
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                📍 Set Current ({currentPwm}) as MIN
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => commandJointPwm(currentConfig.min)}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#F59E0B',
                paddingVertical: 7,
                borderRadius: 8,
                alignItems: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{ color: '#B45309', fontSize: 11, fontWeight: '700' }}>
                ▶️ Jump to Min ({currentConfig.min})
              </Text>
            </TouchableOpacity>
          </View>

          {/* CENTER Card */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#F0F9FF',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1.5,
              borderColor: '#BAE6FD',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0369A1' }}>CENTER (HOME)</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#075985', fontFamily: 'monospace' }}>
                {currentConfig.center}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSetCenter}
              style={{
                backgroundColor: '#0284C7',
                paddingVertical: 9,
                borderRadius: 8,
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                📍 Set Current ({currentPwm}) as CENTER
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                onPress={() => commandJointPwm(currentConfig.center)}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#38BDF8',
                  paddingVertical: 7,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ color: '#0369A1', fontSize: 11, fontWeight: '700' }}>
                  ▶️ Jump ({currentConfig.center})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAutoMidpointCenter}
                style={{
                  backgroundColor: '#E0F2FE',
                  paddingHorizontal: 8,
                  paddingVertical: 7,
                  borderRadius: 8,
                  justifyContent: 'center',
                }}
                activeOpacity={0.75}
              >
                <Text style={{ color: '#0369A1', fontSize: 10, fontWeight: '700' }}>Midpoint</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* MAX Card */}
          <View
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#F5F3FF',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1.5,
              borderColor: '#DDD6FE',
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#6D28D9' }}>MAX LIMIT</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#5B21B6', fontFamily: 'monospace' }}>
                {currentConfig.max}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSetMax}
              style={{
                backgroundColor: '#7C3AED',
                paddingVertical: 9,
                borderRadius: 8,
                alignItems: 'center',
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '800' }}>
                📍 Set Current ({currentPwm}) as MAX
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => commandJointPwm(currentConfig.max)}
              style={{
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: '#A78BFA',
                paddingVertical: 7,
                borderRadius: 8,
                alignItems: 'center',
              }}
              activeOpacity={0.75}
            >
              <Text style={{ color: '#6D28D9', fontSize: 11, fontWeight: '700' }}>
                ▶️ Jump to Max ({currentConfig.max})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Step 3: Test Gestures & Complete Summary Table */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#10B981' }]} />
        <Text accessibilityRole="header" aria-level={2} style={[styles.cardSectionTitle, { marginBottom: 6 }]}>
          3. Verify Gestures & Save Profile
        </Text>
        <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
          Test full-body gestures using your current calibration settings before or after saving.
        </Text>

        {/* Gesture Test Buttons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {[
            { id: 'home', label: '🏠 Home Pose' },
            { id: 'wave_hello', label: '👋 Wave Right' },
            { id: 'wave_left', label: '🤚 Wave Left' },
            { id: 'look_from_side_to_side', label: '👀 Look Side-to-Side' },
            { id: 'open_close_arms', label: '🤗 Open & Close Arms' },
            { id: 'clap', label: '👏 Clap' },
            { id: 'alive_look_around', label: '🌱 Alive Breathing' },
          ].map((g) => {
            const isThisRunning = isTestingGesture && activeGestureName === g.id;
            return (
              <TouchableOpacity
                key={g.id}
                disabled={isTestingGesture}
                onPress={() => onTestGesture(g.id, draftMotors)}
                style={{
                  backgroundColor: isThisRunning ? '#5E43F3' : '#F3F0FC',
                  borderWidth: 1.5,
                  borderColor: '#5E43F3',
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 10,
                  opacity: isTestingGesture && !isThisRunning ? 0.6 : 1,
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isThisRunning ? '#FFFFFF' : '#5E43F3',
                  }}
                >
                  {isThisRunning ? `⏳ ${g.label}...` : g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Full 6-Joint Overview Table */}
        <View
          style={{
            borderWidth: 1,
            borderColor: '#E2E8F0',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: '#F1F5F9',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#E2E8F0',
            }}
          >
            <Text style={{ flex: 2, fontSize: 11, fontWeight: '800', color: '#475569' }}>JOINT</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#475569', textAlign: 'center' }}>CH</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#B45309', textAlign: 'center' }}>MIN</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#0369A1', textAlign: 'center' }}>CENTER</Text>
            <Text style={{ flex: 1, fontSize: 11, fontWeight: '800', color: '#6D28D9', textAlign: 'center' }}>MAX</Text>
          </View>
          {JOINT_METADATA.map((meta, idx) => {
            const cfg = draftMotors[meta.key] || DEFAULT_MOTOR_CALIBRATION_MAP[meta.key];
            const isSelected = selectedJoint === meta.key;
            return (
              <TouchableOpacity
                key={meta.key}
                onPress={() => setSelectedJoint(meta.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: isSelected ? '#F3F0FC' : idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  borderBottomWidth: idx < JOINT_METADATA.length - 1 ? 1 : 0,
                  borderBottomColor: '#E2E8F0',
                }}
              >
                <Text style={{ flex: 2, fontSize: 12, fontWeight: '700', color: '#1E293B' }}>
                  {meta.icon} {meta.label}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#334155', textAlign: 'center', fontFamily: 'monospace' }}>
                  {cfg.channel}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#B45309', textAlign: 'center', fontFamily: 'monospace' }}>
                  {cfg.min}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#0369A1', textAlign: 'center', fontFamily: 'monospace' }}>
                  {cfg.center}
                </Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: '#6D28D9', textAlign: 'center', fontFamily: 'monospace' }}>
                  {cfg.max}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom Action Row: Save Profile or Run Legacy Voice Wizard */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TouchableOpacity
            onPress={handleConfirmSave}
            disabled={isSavingCalibration}
            style={{
              flex: 2,
              minWidth: 220,
              backgroundColor: isSavingCalibration ? '#94A3B8' : '#00875A',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}
            activeOpacity={0.85}
          >
            {isSavingCalibration && <ActivityIndicator size="small" color="#FFF" />}
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
              💾 SAVE CALIBRATION TO ROBOT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onRunVoiceCalibrationWizard}
            style={{
              flex: 1,
              minWidth: 180,
              backgroundColor: '#F8FAFC',
              borderWidth: 1.5,
              borderColor: '#CBD5E1',
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            activeOpacity={0.75}
          >
            <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>
              🎙️ Run Voice Calibration Script
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

export default MotorCalibrationView;
