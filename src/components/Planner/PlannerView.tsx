import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { styles } from '../../styles/theme';

export interface PlannerViewProps {
  activityPrompt: string;
  setActivityPrompt: (prompt: string) => void;
  isGeneratingPlan: boolean;
  generateActivityPlan: () => void;
  currentPlan: any;
  handleUpdateMeta: (field: string, val: string) => void;
  handleChangeStepType: (index: number, type: 'canned' | 'open') => void;
  handleRemoveSubStep: (stepIdx: number, subIdx: number) => void;
  handleUpdateSubStep: (stepIdx: number, subIdx: number, field: string, val: any) => void;
  handleAddSubStep: (stepIdx: number) => void;
  handleUpdateStep: (stepIdx: number, field: string, val: any) => void;
  handleRemoveStep: (index: number) => void;
  handleAddStep: () => void;
  getPlanImages: () => any[];
  selectedImageSize: '1024x1024' | '512x512' | '256x256';
  setSelectedImageSize: (size: '1024x1024' | '512x512' | '256x256') => void;
  generatingImages: { [key: string]: boolean };
  generateImageFor: (img: any) => void;
  isGeneratingAll: boolean;
  generateAllImages: () => void;
  isSavingPlan: boolean;
  savePlanToRobot: () => void;
  plannedFolder: string | null;
  runActivityPlan: () => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({
  activityPrompt,
  setActivityPrompt,
  isGeneratingPlan,
  generateActivityPlan,
  currentPlan,
  handleUpdateMeta,
  handleChangeStepType,
  handleRemoveSubStep,
  handleUpdateSubStep,
  handleAddSubStep,
  handleUpdateStep,
  handleRemoveStep,
  handleAddStep,
  getPlanImages,
  selectedImageSize,
  setSelectedImageSize,
  generatingImages,
  generateImageFor,
  isGeneratingAll,
  generateAllImages,
  isSavingPlan,
  savePlanToRobot,
  plannedFolder,
  runActivityPlan,
}) => {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Generation prompt card */}
      <View style={styles.card}>
        <View style={[styles.cardHeaderAccent, { backgroundColor: '#5C38FF' }]} />
        <Text style={styles.cardSectionTitle}>A. Synthesize New Activity</Text>

        <Text style={styles.inputLabel}>Describe your activity goal</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          multiline
          numberOfLines={4}
          value={activityPrompt}
          onChangeText={setActivityPrompt}
          placeholder="e.g. 10 min 'design a habitat on mars' activity for five 3rd graders..."
          placeholderTextColor="#48446B"
        />

        {/* Clickable prompt examples */}
        <Text style={styles.exampleHeader}>Preset Templates:</Text>
        <View style={styles.exampleRow}>
          {[
            "10 min 'design a habitat on mars' activity for 3rd graders",
            '15 min math multiplication quest for 5th graders',
            '5 min bilingual storytelling activity for preschool kids',
          ].map((exPrompt) => (
            <TouchableOpacity
              key={exPrompt}
              style={styles.exampleChip}
              onPress={() => setActivityPrompt(exPrompt)}
            >
              <Text style={styles.exampleChipText} numberOfLines={1}>
                💡 {exPrompt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isGeneratingPlan ? (
          <View style={[styles.connectButton, styles.buttonDisabled]}>
            <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.buttonText}>LLM COGNITION IN PROGRESS...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectButton} onPress={generateActivityPlan} activeOpacity={0.85}>
            <Text style={styles.buttonText}>GENERATE ACTIVITY PLAN</Text>
          </TouchableOpacity>
        )}
      </View>

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
                accessibilityLabel="Activity Lesson Title Input"
                onChangeText={(val) => handleUpdateMeta('activity_title', val)}
              />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>👥 Target Audience</Text>
              <TextInput
                style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                multiline
                value={currentPlan.target_audience}
                accessibilityLabel="Target Audience Input"
                onChangeText={(val) => handleUpdateMeta('target_audience', val)}
              />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.inputLabel}>⏱️ Approximate Duration</Text>
              <TextInput
                style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                multiline
                value={currentPlan.approximate_duration}
                accessibilityLabel="Approximate Duration Input"
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

            {(currentPlan.steps || []).map((step: any, index: number) => (
              <View
                key={index}
                style={[styles.stepItemCard, step.step_type === 'canned' ? styles.stepItemCanned : styles.stepItemOpen]}
              >
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
                      onPress={() => handleChangeStepType(index, 'canned')}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      focusable={true}
                      accessibilityLabel={`Set step ${index + 1} type to Speech Step`}
                      accessibilityState={{ selected: step.step_type === 'canned' }}
                    >
                      <Text style={styles.stepTypeToggleBtnText}>💬 Speech Step</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.stepTypeToggleBtn, step.step_type === 'open' && styles.stepTypeToggleBtnActive]}
                      onPress={() => handleChangeStepType(index, 'open')}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      focusable={true}
                      accessibilityLabel={`Set step ${index + 1} type to Chat Step`}
                      accessibilityState={{ selected: step.step_type === 'open' }}
                    >
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
                                onPress={() => handleRemoveSubStep(index, subIndex)}
                                activeOpacity={0.7}
                                accessibilityRole="button"
                                focusable={true}
                                accessibilityLabel={`Remove sub-step ${subIndex + 1} from step ${index + 1}`}
                              >
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
                                      style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 8,
                                        backgroundColor: '#F4F3F8',
                                        borderWidth: 1.5,
                                        borderColor: '#E2DFF0',
                                      }}
                                      resizeMode="cover"
                                      accessibilityLabel={`Illustration preview for sub-step ${subIndex + 1}: ${subStep.image_prompt}`}
                                    />
                                    <Text style={[styles.urlLoadedText, { flex: 1 }]}>
                                      ✓ Image URL Ready: {subStep.image_url.substring(0, 30)}...
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={styles.urlPendingText}>⏳ URL Pending. Generate below.</Text>
                                )}
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={styles.subStepAddImageBtn}
                                onPress={() => {
                                  const defaultFilename = `step_${index + 1}_sub_${subIndex + 1}.png`;
                                  handleUpdateSubStep(index, subIndex, 'facial', `[image:${defaultFilename}]`);
                                  handleUpdateSubStep(index, subIndex, 'image_filename', defaultFilename);
                                  handleUpdateSubStep(index, subIndex, 'image_prompt', 'A detailed, colorful illustration...');
                                }}
                                accessibilityRole="button"
                                focusable={true}
                                accessibilityLabel={`Add illustration image slot to sub-step ${subIndex + 1} of step ${index + 1}`}
                              >
                                <Text style={styles.subStepAddImageBtnText}>🖼️ Add Illustration Image</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      <TouchableOpacity
                        style={styles.addSubStepBtn}
                        onPress={() => handleAddSubStep(index)}
                        accessibilityRole="button"
                        focusable={true}
                        accessibilityLabel={`Add new sub-step to step ${index + 1}`}
                      >
                        <Text style={styles.addSubStepBtnText}>➕ Add New Speech Line</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View>
                      <Text style={styles.stepInputLabel}>🤖 What Gigi will do in this step</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                        multiline
                        value={step.goal || ''}
                        onChangeText={(val) => handleUpdateStep(index, 'goal', val)}
                        accessibilityLabel="Step goal description"
                      />

                      <Text style={styles.stepInputLabel}>💬 What Gigi will say to introduce this step</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 50, textAlignVertical: 'top' }]}
                        multiline
                        value={step.robot_script || ''}
                        onChangeText={(val) => handleUpdateStep(index, 'robot_script', val)}
                        accessibilityLabel="Step robot speech script"
                      />

                      <Text style={styles.stepInputLabel}>🔑 Keywords / Hint topics (separated by commas)</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                        multiline
                        value={(step.suggested_topics || []).join(', ')}
                        onChangeText={(val) => handleUpdateStep(index, 'suggested_topics', val)}
                        accessibilityLabel="Step suggested topics list"
                      />

                      <Text style={styles.stepInputLabel}>🛑 When to finish this step (e.g. student nods)</Text>
                      <TextInput
                        style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                        multiline
                        value={step.closing_condition || ''}
                        onChangeText={(val) => handleUpdateStep(index, 'closing_condition', val)}
                        accessibilityLabel="Step closing condition"
                      />

                      {step.image_filename || step.image_prompt ? (
                        <View style={styles.subStepImageContainer}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.subStepInputLabel}>🖼️ Saved Illustration Image Name</Text>
                            <TouchableOpacity
                              onPress={() => {
                                handleUpdateStep(index, 'image_filename', '');
                                handleUpdateStep(index, 'image_prompt', '');
                                handleUpdateStep(index, 'image_url', '');
                              }}
                              accessibilityRole="button"
                              focusable={true}
                              accessibilityLabel={`Clear illustration image slot for step ${index + 1}`}
                            >
                              <Text style={styles.removeSubStepText}>✕ Clear Image</Text>
                            </TouchableOpacity>
                          </View>
                          <TextInput
                            style={[styles.input, { minHeight: 45, textAlignVertical: 'top' }]}
                            multiline
                            value={step.image_filename}
                            onChangeText={(val) => handleUpdateStep(index, 'image_filename', val)}
                            placeholder="e.g. habitat_design.png"
                            placeholderTextColor="#8F8AA9"
                            accessibilityLabel="Step image filename"
                          />

                          <Text style={styles.subStepInputLabel}>Illustration Drawing Prompt</Text>
                          <TextInput
                            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                            multiline
                            value={step.image_prompt}
                            onChangeText={(val) => handleUpdateStep(index, 'image_prompt', val)}
                            placeholder="A beautiful diagram showing..."
                            placeholderTextColor="#8F8AA9"
                            accessibilityLabel="Step image generation prompt"
                          />
                          {step.image_url ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                              <Image
                                source={{ uri: step.image_url }}
                                style={{
                                  width: 80,
                                  height: 80,
                                  borderRadius: 8,
                                  backgroundColor: '#F4F3F8',
                                  borderWidth: 1.5,
                                  borderColor: '#E2DFF0',
                                }}
                                resizeMode="cover"
                                accessibilityLabel={`Illustration preview for step ${index + 1}: ${step.image_prompt}`}
                              />
                              <Text style={[styles.urlLoadedText, { flex: 1 }]}>
                                ✓ Image URL Ready: {step.image_url.substring(0, 30)}...
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.urlPendingText}>⏳ URL Pending. Generate below.</Text>
                          )}
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.subStepAddImageBtn}
                          onPress={() => {
                            const defaultFilename = `step_${index + 1}_open.png`;
                            handleUpdateStep(index, 'image_filename', defaultFilename);
                            handleUpdateStep(index, 'image_prompt', 'A detailed, colorful illustration...');
                          }}
                          accessibilityRole="button"
                          focusable={true}
                          accessibilityLabel={`Add illustration image slot to step ${index + 1}`}
                        >
                          <Text style={styles.subStepAddImageBtnText}>🖼 ADD IMAGE TO OPEN STEP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.removeStepBtn}
                    onPress={() => handleRemoveStep(index)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    focusable={true}
                    accessibilityLabel={`Remove step ${index + 1} from activity plan`}
                  >
                    <Text style={styles.removeStepBtnText}>🗑 REMOVE STEP</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addStepButton}
              onPress={handleAddStep}
              activeOpacity={0.8}
              accessibilityRole="button"
              focusable={true}
              accessibilityLabel="Append a new empty step to the activity plan"
            >
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
                        onPress={() => setSelectedImageSize(size)}
                        activeOpacity={0.8}
                        accessibilityRole="tab"
                        focusable={true}
                        accessibilityLabel={`Set generated image size to ${size}`}
                        accessibilityState={{ selected: isActive }}
                      >
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
                const uniqueKey =
                  img.subStepIndex !== undefined
                    ? `step-${img.stepIndex}-sub-${img.subStepIndex}`
                    : `step-${img.stepIndex}`;
                const isGenerating = generatingImages[uniqueKey];

                return (
                  <View key={img.key} style={styles.imageAssetRow}>
                    <View style={styles.imageAssetInfo}>
                      <Text style={styles.imageAssetFilename}>📁 {img.filename}</Text>
                      <Text style={styles.imageAssetStep}>
                        Step {img.stepIndex + 1}{' '}
                        {img.subStepIndex !== undefined ? `(Sub-step ${img.subStepIndex + 1})` : '(Open Step)'}
                      </Text>
                      <TextInput
                        style={[styles.input, styles.imageAssetPromptInput]}
                        multiline
                        value={img.prompt}
                        onChangeText={(val) => {
                          if (img.subStepIndex !== undefined) {
                            handleUpdateSubStep(img.stepIndex, img.subStepIndex, 'image_prompt', val);
                          } else {
                            handleUpdateStep(img.stepIndex, 'image_prompt', val);
                          }
                        }}
                        placeholder="Image prompt..."
                        placeholderTextColor="#8F8AA9"
                        accessibilityLabel="Image asset generation prompt"
                      />
                      {img.url ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                          <Image
                            source={{ uri: img.url }}
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: 8,
                              backgroundColor: '#F4F3F8',
                              borderWidth: 1.5,
                              borderColor: '#E2DFF0',
                            }}
                            resizeMode="cover"
                            accessibilityLabel={`DALL-E generated illustration: ${img.prompt}`}
                          />
                          <Text style={[styles.imageAssetUrl, { flex: 1 }]} numberOfLines={1}>
                            🔗 {img.url}
                          </Text>
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
                          onPress={() => generateImageFor(img)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          focusable={true}
                          accessibilityLabel={
                            img.url
                              ? `Regenerate illustration for ${img.filename}`
                              : `Generate illustration for ${img.filename}`
                          }
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
                  accessibilityRole="button"
                  focusable={true}
                  accessibilityLabel="Generate all missing plan illustrations using DALL-E"
                >
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
                  accessibilityRole="button"
                  focusable={true}
                  accessibilityLabel="Save activity plan to Gigi robot"
                >
                  <Text style={styles.buttonText}>💾 SAVE TO ROBOT</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.runPlanButton,
                  !plannedFolder && styles.buttonDisabled,
                  { flex: 1, marginLeft: 12 },
                ]}
                disabled={!plannedFolder}
                onPress={runActivityPlan}
                activeOpacity={0.8}
                accessibilityRole="button"
                focusable={true}
                accessibilityLabel="Execute activity plan on robot"
                accessibilityState={{ disabled: !plannedFolder }}
              >
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
  );
};

export default PlannerView;
