import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { styles } from '../../styles/theme';
import {
  ConnectionStatus,
  MotorJointName,
  MotorJointConfig,
  MotorCalibrationMap,
  CalibrationStatusInfo,
} from '../../types';

export interface MotorCalibrationViewProps {
  connectionStatus: ConnectionStatus;
  isRobotCalibrated: boolean | null;
  calibrationStatusInfo: CalibrationStatusInfo | null;
  motorCalibration: MotorCalibrationMap | null;
  isSavingCalibration: boolean;
  isTestingGesture: boolean;
  activeGestureName: string | null;
  onFetchCalibration: () => void;
  onMoveChannelPwm: (channel: number, pwm: number, joint?: MotorJointName) => void;
  onWiggleChannel: (channel: number, basePwm?: number) => void;
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
  onFetchCalibration,
  onMoveChannelPwm,
  onWiggleChannel,
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
  const [showWiringGuide, setShowWiringGuide] = useState<boolean>(false);
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
    const targetPwm = livePwmByJoint[selectedJoint] ?? currentConfig.center ?? 300;
    setManualPwmInput(String(targetPwm));
    setProbeChannel(currentConfig.channel);
  }, [selectedJoint, currentConfig.channel, currentConfig.center, livePwmByJoint]);

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

  const renderHardwareWiringReference = () => (
    <View
      style={{
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        gap: 12,
      }}
    >
      <View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#0F172A' }}>
          🔌 Hardware Assembly & I2C Circuit Reference (Orange Pi 5 Pro ↔ PCA9685)
        </Text>
        <Text style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 18 }}>
          Verify this 4-wire I2C connection between the Orange Pi 5 Pro 40-pin GPIO header (left, near the antenna and Cdtech 20U5622 wireless module) and the PCA9685 16-Channel 12-bit PWM Servo Driver (right) before calibrating motors.
        </Text>
      </View>

      {/* Circuit Photo */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 8,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          alignItems: 'center',
        }}
      >
        <Image
          source={{ uri: './Assm_CIRCUIT.jpg' }}
          accessibilityLabel="Orange Pi 5 Pro to PCA9685 I2C wiring circuit diagram"
          style={{
            width: '100%',
            maxWidth: 680,
            height: 360,
            borderRadius: 8,
          }}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 11, color: '#64748B', marginTop: 6, fontWeight: '600' }}>
          Figure: Assm_CIRCUIT.jpg — Orange Pi 5 Pro GPIO Pins 1, 3, 5, 6 wired to PCA9685 VCC, SDA, SCL, and GND
        </Text>
      </View>

      {/* 4-Wire I2C Pinout Mapping Table */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#F1F5F9',
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
          }}
        >
          <Text style={{ flex: 1.1, fontSize: 11, fontWeight: '800', color: '#334155' }}>WIRE</Text>
          <Text style={{ flex: 1.6, fontSize: 11, fontWeight: '800', color: '#334155' }}>ORANGE PI 5 PRO</Text>
          <Text style={{ flex: 1.2, fontSize: 11, fontWeight: '800', color: '#334155' }}>PCA9685 PIN</Text>
          <Text style={{ flex: 2.5, fontSize: 11, fontWeight: '800', color: '#334155' }}>FUNCTION & NOTES</Text>
        </View>

        {[
          {
            wire: '🔴 Red',
            wireColor: '#DC2626',
            opiPin: 'Pin 1 (VCC 3.3V)',
            pcaPin: 'VCC',
            desc: '3.3V logic power for the PCA9685 chip and its onboard SDA/SCL pull-up resistors (WARNING: connect strictly to 3.3V Pin 1, never 5V, so I2C pull-ups do not exceed the Orange Pi 3.3V GPIO limit).',
          },
          {
            wire: '🟢 Green',
            wireColor: '#16A34A',
            opiPin: 'Pin 3 (SDA / I2C)',
            pcaPin: 'SDA',
            desc: 'Bidirectional I2C Data line to PCA9685 (default I2C bus address 0x40).',
          },
          {
            wire: '🟡 Yellow',
            wireColor: '#CA8A04',
            opiPin: 'Pin 5 (SCL / I2C)',
            pcaPin: 'SCL',
            desc: 'I2C Clock line synchronizing 50 Hz PWM register updates (ticks 50–600).',
          },
          {
            wire: '⚫ Black',
            wireColor: '#0F172A',
            opiPin: 'Pin 6 (GND)',
            pcaPin: 'GND',
            desc: 'Common signal ground reference between Orange Pi 5 Pro (3rd row, right pin) and PCA9685.',
          },
        ].map((row, i) => (
          <View
            key={row.pcaPin}
            style={{
              flexDirection: 'row',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderBottomWidth: i < 3 ? 1 : 0,
              borderBottomColor: '#F1F5F9',
              alignItems: 'center',
            }}
          >
            <Text style={{ flex: 1.1, fontSize: 12, fontWeight: '800', color: row.wireColor }}>{row.wire}</Text>
            <Text style={{ flex: 1.6, fontSize: 12, fontWeight: '700', color: '#1E293B', fontFamily: 'monospace' }}>
              {row.opiPin}
            </Text>
            <Text style={{ flex: 1.2, fontSize: 12, fontWeight: '800', color: '#5E43F3', fontFamily: 'monospace' }}>
              {row.pcaPin}
            </Text>
            <Text style={{ flex: 2.5, fontSize: 11, color: '#475569', lineHeight: 16 }}>{row.desc}</Text>
          </View>
        ))}
      </View>

      {/* Servo 3-Pin Output Header & Unconnected Pins Explanation */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <View
          style={{
            flex: 1,
            minWidth: 240,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>
            🦾 3-Row Servo Output Headers (Channels 0–15, Bottom Right):
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '800', color: '#CA8A04' }}>Top Row (Yellow Pin):</Text> PWM Signal wire (Orange/Yellow/White on servo plug).
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '800', color: '#DC2626' }}>Middle Row (Red Pin):</Text> V+ External 5V–6V Servo Power rail (Red wire on servo plug).
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '800', color: '#0F172A' }}>Bottom Row (Black Pin):</Text> Ground rail (Brown/Black wire on servo plug).
          </Text>
        </View>

        <View
          style={{
            flex: 1,
            minWidth: 240,
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1E293B', marginBottom: 2 }}>
            ℹ️ Unconnected Side Pins & Default Channel Map:
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '700', color: '#334155' }}>OE (Output Enable):</Text> Left unconnected (internal pull-down keeps outputs enabled by default).
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '700', color: '#334155' }}>Side V+ Pin:</Text> Left unconnected when 5V–6V servo power is supplied via the top screw terminal.
          </Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
            • <Text style={{ fontWeight: '700', color: '#5E43F3' }}>Standard Channels:</Text> CH 0 = Torso, CH 1 = Neck, CH 2/7 = Left Shoulder, CH 3 = Right Shoulder, CH 14/2 = Right Elbow, CH 15/6 = Left Elbow.
          </Text>
        </View>
      </View>
    </View>
  );

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

        <View style={styles.card}>
          <View style={[styles.cardHeaderAccent, { backgroundColor: '#0284C7' }]} />
          {renderHardwareWiringReference()}
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
            onPress={() => {
              onSaveCalibration(draftMotors);
            }}
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowWiringGuide(!showWiringGuide)}
              style={{
                backgroundColor: showWiringGuide ? '#E0F2FE' : '#F8FAFC',
                borderWidth: 1,
                borderColor: showWiringGuide ? '#0284C7' : '#CBD5E1',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
              }}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: showWiringGuide ? '#0369A1' : '#334155' }}>
                {showWiringGuide ? '🔼 Hide Circuit Wiring Diagram' : '🔌 View Circuit & I2C Pinout (Assm_CIRCUIT)'}
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

        {showWiringGuide && (
          <View style={{ marginBottom: 16 }}>
            {renderHardwareWiringReference()}
          </View>
        )}

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
              🔍 PCA9685 16-Channel Wiggle Scanner (Unsure which wire goes where?)
            </Text>
            <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
              Tap any channel (0–15) to gently wiggle it back and forth around 300 PWM. Once you see which physical body part moves, click "Assign to {currentMeta.label}".
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ALL_CHANNELS.map((ch) => {
                const isSelectedProbe = probeChannel === ch;
                const assignedTo = channelOwners[ch]?.join(', ');
                return (
                  <TouchableOpacity
                    key={ch}
                    onPress={() => {
                      setProbeChannel(ch);
                      onWiggleChannel(ch, 300);
                    }}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: 1.5,
                      borderColor: isSelectedProbe ? '#5E43F3' : assignedTo ? '#93C5FD' : '#CBD5E1',
                      backgroundColor: isSelectedProbe ? '#EDE9FE' : assignedTo ? '#EFF6FF' : '#FFFFFF',
                      minWidth: 68,
                      alignItems: 'center',
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: isSelectedProbe ? '#5E43F3' : '#1E293B' }}>
                      CH {ch}
                    </Text>
                    <Text style={{ fontSize: 9, color: '#64748B', marginTop: 2 }} numberOfLines={1}>
                      {assignedTo ? assignedTo.split(' ')[0] : 'Unused'}
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
            onPress={() => {
              onSaveCalibration(draftMotors);
            }}
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
