/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import PlannerView from '../src/components/Planner/PlannerView';
import MotorCalibrationView from '../src/components/Calibration/MotorCalibrationView';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

test.each([
  ['the initial empty state', null],
  [
    'a populated plan with canned and open steps',
    {
      activity_title: 'Practice counting',
      target_audience: 'Kindergarten students',
      approximate_duration: '20 minutes',
      number_of_students: 10,
      steps: [
        {
          step_type: 'canned',
          title: 'Introduce the activity',
          description: 'Introduce the counting activity.',
        },
        {
          step_type: 'open',
          title: 'Count together',
          description: 'Count objects together.',
        },
      ],
    },
  ],
])('PlannerView renders cleanly with %s', async (_description, currentPlan) => {
  let plannerRenderer: ReactTestRenderer.ReactTestRenderer | undefined;

  try {
    await ReactTestRenderer.act(() => {
      plannerRenderer = ReactTestRenderer.create(
        <PlannerView
          currentPlan={currentPlan}
          getPlanImages={() => []}
          generatingImages={{}}
          activityPrompt=""
          setActivityPrompt={jest.fn()}
          isGeneratingPlan={false}
          generateActivityPlan={jest.fn()}
          handleUpdateMeta={jest.fn()}
          handleChangeStepType={jest.fn()}
          handleRemoveSubStep={jest.fn()}
          handleUpdateSubStep={jest.fn()}
          handleAddSubStep={jest.fn()}
          handleUpdateStep={jest.fn()}
          handleRemoveStep={jest.fn()}
          handleAddStep={jest.fn()}
          selectedImageSize="1024x1024"
          setSelectedImageSize={jest.fn()}
          generateImageFor={jest.fn()}
          isGeneratingAll={false}
          generateAllImages={jest.fn()}
          isSavingPlan={false}
          savePlanToRobot={jest.fn()}
          plannedFolder={null}
          runActivityPlan={jest.fn()}
        />,
      );
    });

    expect(plannerRenderer!.toJSON()).not.toBeNull();
  } finally {
    await ReactTestRenderer.act(() => {
      plannerRenderer?.unmount();
    });
  }
});

test('MotorCalibrationView renders cleanly in connected and disconnected states', async () => {
  let calibRenderer: ReactTestRenderer.ReactTestRenderer | undefined;

  try {
    await ReactTestRenderer.act(() => {
      calibRenderer = ReactTestRenderer.create(
        <MotorCalibrationView
          connectionStatus="connected"
          isRobotCalibrated={true}
          calibrationStatusInfo={{ calibrated: true, reason: 'ok', calibrated_at: '2026-10-26T12:00:00Z' }}
          motorCalibration={{
            neck: { channel: 1, min: 175, center: 275, max: 375, calibrated: true },
            torso: { channel: 0, min: 175, center: 310, max: 425, calibrated: true },
            left_shoulder: { channel: 7, min: 200, center: 325, max: 375, calibrated: true },
            right_shoulder: { channel: 3, min: 100, center: 175, max: 325, calibrated: true },
            left_elbow: { channel: 6, min: 250, center: 275, max: 300, calibrated: true },
            right_elbow: { channel: 2, min: 150, center: 275, max: 400, calibrated: true },
          }}
          isSavingCalibration={false}
          isTestingGesture={false}
          activeGestureName={null}
          onFetchCalibration={jest.fn()}
          onMoveChannelPwm={jest.fn()}
          onWiggleChannel={jest.fn()}
          onHomeMotors={jest.fn()}
          onReleaseMotors={jest.fn()}
          onTestGesture={jest.fn()}
          onSaveCalibration={jest.fn()}
          onRunVoiceCalibrationWizard={jest.fn()}
        />,
      );
    });

    expect(calibRenderer!.toJSON()).not.toBeNull();
  } finally {
    await ReactTestRenderer.act(() => {
      calibRenderer?.unmount();
    });
  }
});
