import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from '../../styles/theme';

export interface CalibrationBannerProps {
  isRobotCalibrated: boolean | null;
  onCalibrate: () => void;
}

export const CalibrationBanner: React.FC<CalibrationBannerProps> = ({
  isRobotCalibrated,
  onCalibrate,
}) => {
  if (isRobotCalibrated === false) {
    return (
      <View style={styles.calibrationCardWarning}>
        <View style={styles.calibrationWarningHeader}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <Text style={styles.calibrationWarningTitle}>Motors Uncalibrated (Movement Locked)</Text>
        </View>
        <Text style={styles.calibrationWarningText}>
          Gigi's physical motors must be calibrated locally before running any activities to ensure correct PWM center points and prevent mechanical damage.
        </Text>
        <TouchableOpacity
          style={styles.calibrationCalibrateButton}
          onPress={onCalibrate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Run Motor Calibration Wizard"
        >
          <Text style={styles.calibrationCalibrateButtonText}>🔧 RUN MOTOR CALIBRATION NOW</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isRobotCalibrated === true) {
    return (
      <View style={styles.calibrationCardSuccess}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.calibrationSuccessTitle}>🟢 Motors Calibrated & Safe</Text>
          <Text style={styles.calibrationSuccessSubText}>All servo ranges and center positions verified.</Text>
        </View>
        <TouchableOpacity
          style={styles.recalibrateButton}
          onPress={onCalibrate}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Recalibrate Motors"
        >
          <Text style={styles.recalibrateButtonText}>⚙️ Recalibrate</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

export default CalibrationBanner;
