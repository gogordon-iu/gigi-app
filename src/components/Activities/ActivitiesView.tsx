import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { styles } from '../../styles/theme';
import { ScriptItem, ConnectionStatus } from '../../types';
import { CalibrationBanner } from './CalibrationBanner';

export type MainCategoryTab = 'all' | 'core' | 'plan' | 'custom';

export interface ActivitiesViewProps {
  connectionStatus: ConnectionStatus;
  handlePing: () => void;
  isLoadingScripts: boolean;
  isRobotCalibrated: boolean | null;
  handleCalibrateMotors: () => void;
  scripts: ScriptItem[];
  selectedCategory: MainCategoryTab | string;
  setSelectedCategory: (cat: any) => void;
  selectedScript: string | null;
  setSelectedScript: (script: string | null) => void;
  isRunning: boolean;
  runningScriptInfo: any;
  handleRunScript: () => void;
  handleStopScript: () => void;
}

export const ActivitiesView: React.FC<ActivitiesViewProps> = ({
  connectionStatus,
  handlePing,
  isLoadingScripts,
  isRobotCalibrated,
  handleCalibrateMotors,
  scripts,
  selectedCategory,
  setSelectedCategory,
  selectedScript,
  setSelectedScript,
  isRunning,
  runningScriptInfo,
  handleRunScript,
  handleStopScript,
}) => {
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  // Compute counts
  const counts = useMemo(() => {
    let core = 0;
    let plan = 0;
    let custom = 0;
    for (const s of scripts) {
      if (s.type === 'core' || s.type === 'demo') {
        core++;
      } else if (s.type === 'plan' || (s.type === 'script' && s.name.startsWith('activity_plan_'))) {
        plan++;
      } else if (s.type === 'custom' || (s.type === 'script' && s.name.startsWith('custom_interaction_'))) {
        custom++;
      } else {
        core++;
      }
    }
    return { all: scripts.length, core, plan, custom };
  }, [scripts]);

  // Filtered list
  const filteredActivities = useMemo(() => {
    return scripts.filter((s) => {
      // 1. Filter by top-level category
      if (selectedCategory === 'core') {
        const isCore = s.type === 'core' || s.type === 'demo';
        if (!isCore) return false;
      } else if (selectedCategory === 'plan') {
        const isPlan = s.type === 'plan' || (s.type === 'script' && s.name.startsWith('activity_plan_'));
        if (!isPlan) return false;
      } else if (selectedCategory === 'custom') {
        const isCustom = s.type === 'custom' || (s.type === 'script' && s.name.startsWith('custom_interaction_'));
        if (!isCustom) return false;
      }

      // 2. Filter by subcategory pill (if applicable)
      if (subCategoryFilter !== 'all' && (selectedCategory === 'core' || selectedCategory === 'all')) {
        if (s.category !== subCategoryFilter) {
          return false;
        }
      }

      return true;
    });
  }, [scripts, selectedCategory, subCategoryFilter]);

  const selectedItem = useMemo(() => {
    return scripts.find((s) => s.name === selectedScript) || null;
  }, [scripts, selectedScript]);

  const mainTabs: { key: MainCategoryTab; label: string; count: number }[] = [
    { key: 'all', label: '🌟 All Activities', count: counts.all },
    { key: 'core', label: '📦 Core Package', count: counts.core },
    { key: 'plan', label: '📚 Lesson Plans', count: counts.plan },
    { key: 'custom', label: '🎭 Custom', count: counts.custom },
  ];

  const subCategoryPills = [
    { key: 'all', label: 'All Domains' },
    { key: 'learning', label: '🎓 Learning Games' },
    { key: 'social', label: '💬 Social & Greeters' },
    { key: 'scripted', label: '📖 Scripted Stories' },
    { key: 'autonomous', label: '🌱 Autonomous' },
    { key: 'utility', label: '⚙️ Hardware Utility' },
  ];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#A000FF' }]} />
        <Text accessibilityRole="header" aria-level={2} style={styles.cardSectionTitle}>
          🤖 Robot Activities
        </Text>

        {connectionStatus !== 'connected' ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 24, marginBottom: 12, textAlign: 'center' }}>⚠️</Text>
            <Text style={styles.emptyText}>Gigi is Offline</Text>
            <Text style={[styles.emptySubText, { textAlign: 'center', marginTop: 4 }]}>
              Please establish a connection in the "Chat & Manual Control" tab first before selecting activities.
            </Text>
          </View>
        ) : (
          <>
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

            {/* Motor Calibration Status Banner */}
            <CalibrationBanner
              isRobotCalibrated={isRobotCalibrated}
              onCalibrate={handleCalibrateMotors}
            />

            {scripts.length > 0 ? (
              <>
                <Text style={[styles.inputLabel, { marginTop: 15 }]}>Available Activities:</Text>

                {/* Modern Multi-Category Segmented Tabs */}
                <View style={styles.categoryTabsContainer}>
                  {mainTabs.map((tab) => {
                    const isActive = selectedCategory === tab.key;
                    return (
                      <TouchableOpacity
                        key={tab.key}
                        style={[styles.categoryTabButton, isActive && styles.categoryTabButtonActive]}
                        onPress={() => {
                          setSelectedCategory(tab.key);
                          setSubCategoryFilter('all');
                        }}
                        activeOpacity={0.8}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isActive }}
                      >
                        <Text style={[styles.categoryTabText, isActive && styles.categoryTabTextActive]}>
                          {tab.label} ({tab.count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Domain Subcategory Filters (visible for Core or All) */}
                {(selectedCategory === 'core' || selectedCategory === 'all') && (
                  <View style={styles.subCategoryContainer}>
                    {subCategoryPills.map((pill) => {
                      const isActive = subCategoryFilter === pill.key;
                      return (
                        <TouchableOpacity
                          key={pill.key}
                          style={[styles.subCategoryPill, isActive && styles.subCategoryPillActive]}
                          onPress={() => setSubCategoryFilter(pill.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.subCategoryText, isActive && styles.subCategoryTextActive]}>
                            {pill.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Activity Cards List */}
                <View style={styles.activityCardsGrid}>
                  {filteredActivities.length === 0 ? (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>
                        No activities match the selected filter.
                      </Text>
                    </View>
                  ) : (
                    filteredActivities.map((s) => {
                      const isSelected = selectedScript === s.name;
                      return (
                        <TouchableOpacity
                          key={s.name}
                          style={[styles.activityCard, isSelected && styles.activityCardSelected]}
                          onPress={() => setSelectedScript(s.name)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Select activity ${s.displayName || s.name}`}
                        >
                          <Text style={styles.activityCardIcon}>{s.icon || '🚀'}</Text>
                          <View style={styles.activityCardContent}>
                            <View style={styles.activityCardHeader}>
                              <Text
                                style={[styles.activityCardTitle, isSelected && styles.activityCardTitleSelected]}
                                numberOfLines={1}
                              >
                                {s.displayName || s.name}
                              </Text>
                              {s.badge && (
                                <View style={styles.activityCardBadge}>
                                  <Text style={styles.activityCardBadgeText}>{s.badge}</Text>
                                </View>
                              )}
                            </View>
                            {s.description ? (
                              <Text style={styles.activityCardDesc} numberOfLines={2}>
                                {s.description}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>

                {/* Selected Activity Detail & Action Panel */}
                {selectedItem && (
                  <View style={styles.activityDetailCard}>
                    <View style={styles.activityDetailHeader}>
                      <Text style={styles.activityDetailTitle}>
                        {selectedItem.icon || '🚀'} {selectedItem.displayName}
                      </Text>
                      {selectedItem.badge && (
                        <View style={styles.activityCardBadge}>
                          <Text style={styles.activityCardBadgeText}>{selectedItem.badge}</Text>
                        </View>
                      )}
                    </View>

                    {selectedItem.description ? (
                      <Text style={[styles.activityCardDesc, { marginBottom: 6 }]}>
                        {selectedItem.description}
                      </Text>
                    ) : null}

                    <Text style={styles.activityDetailTarget}>
                      Target: {selectedItem.name}
                    </Text>

                    {isRobotCalibrated === false && selectedItem.name !== 'calibrate_motors.py' && (
                      <View
                        style={{
                          backgroundColor: '#FFF4E5',
                          borderRadius: 8,
                          padding: 8,
                          marginVertical: 8,
                          borderWidth: 1,
                          borderColor: '#FFD8B3',
                        }}
                      >
                        <Text style={{ color: '#D97706', fontSize: 11, fontWeight: '700' }}>
                          ⚠️ Movement Locked: Motors must be calibrated before starting this activity.
                        </Text>
                      </View>
                    )}

                    {/* Execution Controls */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.runButton, (!selectedScript || isRunning) && styles.buttonDisabled]}
                        disabled={!selectedScript || isRunning}
                        onPress={handleRunScript}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonText}>🚀 RUN ACTIVITY</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.stopButton, !isRunning && styles.buttonDisabled]}
                        disabled={!isRunning}
                        onPress={handleStopScript}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonText}>🛑 STOP</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              !isLoadingScripts && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No activities loaded yet.</Text>
                  <Text style={styles.emptySubText}>
                    Click the button above to load activities from the Gigi robot.
                  </Text>
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
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default ActivitiesView;
