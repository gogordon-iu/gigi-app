import { getActivityMetadata, CORE_ACTIVITIES_CATALOG } from '../src/constants/activities';

describe('Activity Metadata & Filtering Architecture', () => {
  test('maps all core activities correctly to their domain categories', () => {
    expect(getActivityMetadata('alive_mode.py').category).toBe('autonomous');
    expect(getActivityMetadata('alive_mode.py').displayName).toBe('Alive Mode');
    expect(getActivityMetadata('calibrate_motors.py').category).toBe('utility');
    expect(getActivityMetadata('calibrate_motors.py').displayName).toBe('Motor Calibration Wizard');
    expect(getActivityMetadata('make_friends.py').category).toBe('social');
    expect(getActivityMetadata('math_quest.py').category).toBe('learning');
    expect(getActivityMetadata('reading_fluency.py').category).toBe('learning');
    expect(getActivityMetadata('ferris.py').category).toBe('scripted');
  });

  test('maps legacy and structured lesson plans correctly including Mars Habitat', () => {
    const mars = getActivityMetadata('activity_plan_mars_habitat');
    expect(mars.displayName).toBe('Design a Habitat on Mars');
    expect(mars.category).toBe('plan');
    expect(mars.icon).toBe('🪐');

    const marsLegacy = getActivityMetadata('activity_plan_20260408_cb76d0');
    expect(marsLegacy.displayName).toBe('Design a Habitat on Mars');
    expect(marsLegacy.category).toBe('plan');

    const waves = getActivityMetadata('activity_plan_waves_energy');
    expect(waves.displayName).toBe('Waves & Energy Science');
    expect(waves.category).toBe('plan');

    const ethics = getActivityMetadata('activity_plan_ai_ethics');
    expect(ethics.displayName).toBe('Robotics Ethics Workshop');
    expect(ethics.category).toBe('plan');

    const storytelling = getActivityMetadata('activity_plan_storytelling');
    expect(storytelling.displayName).toBe('Imaginative Storytelling Adventure');
    expect(storytelling.category).toBe('plan');
  });

  test('maps custom interactions correctly', () => {
    const greeter = getActivityMetadata('custom_interaction_greeter');
    expect(greeter.displayName).toBe('Classroom Morning Greeter');
    expect(greeter.category).toBe('custom');
    expect(greeter.icon).toBe('👋');

    const numberGame = getActivityMetadata('custom_interaction_guessing_game');
    expect(numberGame.displayName).toBe('Secret Number Challenge');
    expect(numberGame.category).toBe('custom');
    expect(numberGame.icon).toBe('🎯');
  });

  test('filtering domain removes items outside the domain', () => {
    const items = [
      'alive_mode.py',
      'alive_mode.py',
      'calibrate_motors.py',
      'face_recognition_demo.py',
      'make_friends.py',
      'reading_fluency.py',
    ];

    // Deduplicate
    const unique = Array.from(new Set(items)).map((name) => {
      const meta = getActivityMetadata(name);
      return { name, ...meta, type: 'core' };
    });

    expect(unique.length).toBe(5); // alive_mode, calibrate_motors, face_recognition, make_friends, reading_fluency

    // Filter by social
    const social = unique.filter((s) => s.category === 'social');
    expect(social.map((s) => s.displayName)).toEqual(['Face Recognition', 'Make Friends']);
    expect(social.some((s) => s.displayName === 'Alive Mode')).toBe(false);
    expect(social.some((s) => s.displayName === 'Motor Calibration Wizard')).toBe(false);

    // Filter by autonomous
    const autonomous = unique.filter((s) => s.category === 'autonomous');
    expect(autonomous.map((s) => s.displayName)).toEqual(['Alive Mode']);

    // Filter by utility
    const utility = unique.filter((s) => s.category === 'utility');
    expect(utility.map((s) => s.displayName)).toEqual(['Motor Calibration Wizard']);
  });
});
