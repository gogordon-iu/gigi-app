export type ActivityType = 'core' | 'plan' | 'custom' | 'demo' | 'script' | 'zhennan';

export type ActivityCategory =
  | 'all'
  | 'core'
  | 'learning'
  | 'social'
  | 'scripted'
  | 'autonomous'
  | 'plan'
  | 'custom'
  | 'utility';

export interface ScriptItem {
  name: string;
  type: ActivityType;
  category?: ActivityCategory;
  displayName: string;
  description?: string;
  icon?: string;
  badge?: string;
  module?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'output' | 'raw';
}

export interface IssuedToken {
  username: string;
  token: string;
  expiration: string;
  generationCount: number;
  createdAt: string;
}

export type UserRole = 'admin' | 'user' | null;

export type ActiveTab = 'console' | 'activities' | 'calibration' | 'planner' | 'interaction' | 'manager';

export type MotorJointName =
  | 'neck'
  | 'torso'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow';

export interface MotorJointConfig {
  channel: number;
  min: number;
  max: number;
  center: number;
  calibrated: boolean;
  direction?: string;
}

export type MotorCalibrationMap = Record<MotorJointName, MotorJointConfig>;

export interface CalibrationStatusInfo {
  calibrated: boolean;
  reason?: string;
  local_file_exists?: boolean;
  active_path?: string | null;
  calibrated_at?: string | null;
}

export type TransportMode = 'serial' | 'bluetooth' | 'websocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface PlanSubStep {
  facial?: string;
  text?: string;
  image_filename?: string;
  image_path?: string;
  image_url?: string;
  movement?: string;
}

export interface PlanStep {
  title?: string;
  text?: string;
  question?: string;
  options?: string[];
  image_prompt?: string;
  image_filename?: string;
  image_path?: string;
  image_url?: string;
  sub_steps?: PlanSubStep[];
}

export interface ActivityPlan {
  activity_title: string;
  target_audience: string;
  approximate_duration: string;
  number_of_students: string;
  steps: PlanStep[];
}

export interface CustomInteraction {
  interaction_title: string;
  target_audience?: string;
  description?: string;
  scenes: any[];
}

export interface WifiStatus {
  connected: boolean;
  ssid: string;
  ip: string;
  hostname?: string;
  hotspot_active?: boolean;
  hotspot_ssid?: string;
  hotspot_ip?: string;
  hotspot_password?: string;
  ssh_command?: string;
}

export interface WifiNetwork {
  ssid: string;
  signal: number;
  security: string;
}

export interface BtSshStatus {
  enabled: boolean;
  channel?: number;
  active_sessions?: number;
  bt_name?: string;
  bt_mac?: string;
  ssh_command?: string;
  shell_cwd?: string;
  shell_prompt?: string;
  shell_running?: boolean;
}

export interface BtShellEntry {
  id: string;
  prompt: string;
  command: string;
  output: string;
  returncode?: number | null;
  running?: boolean;
  error?: string;
  timestamp: string;
}
