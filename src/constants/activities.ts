/**
 * Catalog and metadata for Gigi core package activities (gigi.activities).
 * Maps robot package modules and scripts to clean display titles, icons,
 * subcategories, and rich descriptions.
 */

export interface ActivityMetadata {
  displayName: string;
  category: 'learning' | 'social' | 'scripted' | 'autonomous' | 'utility' | 'plan' | 'custom';
  description: string;
  icon: string;
  badge: string;
}

export const CORE_ACTIVITIES_CATALOG: Record<string, ActivityMetadata> = {
  math_quest: {
    displayName: 'Math Quest',
    category: 'learning',
    description: 'Adaptive math tutoring game with arithmetic challenges, progress rewards, and voice feedback.',
    icon: '🔢',
    badge: 'Learning Game',
  },
  reading_fluency: {
    displayName: 'Reading Fluency Coach',
    category: 'learning',
    description: 'Speech-driven oral reading tutor offering phrase repetition and real-time pronunciation guidance.',
    icon: '📖',
    badge: 'Reading & Literacy',
  },
  mastermind: {
    displayName: 'Mastermind Game',
    category: 'learning',
    description: 'Classic code-breaking logic puzzle testing deductive reasoning and pattern discovery.',
    icon: '🧩',
    badge: 'Logic & Puzzle',
  },
  story_game: {
    displayName: 'Interactive Story Game',
    category: 'learning',
    description: 'Branching choose-your-own-adventure storytelling accompanied by dramatic physical expressions.',
    icon: '🏰',
    badge: 'Story Adventure',
  },
  intro_to_gigi: {
    displayName: 'Intro to Gigi',
    category: 'social',
    description: 'Comprehensive robot self-introduction demonstrating eye expressions, gestures, and audio capabilities.',
    icon: '👋',
    badge: 'Social & Onboarding',
  },
  make_friends: {
    displayName: 'Make Friends',
    category: 'social',
    description: 'Interactive social icebreaker that asks students questions and establishes personal rapport.',
    icon: '🤝',
    badge: 'Social Conversation',
  },
  receptionist: {
    displayName: 'Receptionist Greeter',
    category: 'social',
    description: 'Autonomous front-desk greeter that detects approaching visitors and offers a warm welcome.',
    icon: '🏢',
    badge: 'Social Greeting',
  },
  face_recognition_demo: {
    displayName: 'Face Recognition',
    category: 'social',
    description: 'Vision-based face identification and personalized greeting demonstration.',
    icon: '👁️',
    badge: 'Vision & Perception',
  },
  alive_mode: {
    displayName: 'Alive Mode',
    category: 'autonomous',
    description: 'Autonomous lifelike idle behaviors, periodic head/torso breathing gestures, and gaze tracking.',
    icon: '🌱',
    badge: 'Autonomous Mode',
  },
  ferris: {
    displayName: 'Ferris Wheel Story',
    category: 'scripted',
    description: 'Scripted STEM history lesson recounting the invention and engineering of the Ferris Wheel.',
    icon: '🎡',
    badge: 'Curriculum Story',
  },
  halloween: {
    displayName: 'Halloween Adventure',
    category: 'scripted',
    description: 'Thematic seasonal story lesson with sound effects, spooky expressions, and acting.',
    icon: '🎃',
    badge: 'Curriculum Story',
  },
  lego: {
    displayName: 'Bilingual Lego Building',
    category: 'scripted',
    description: 'Hands-on spatial construction activity with bilingual English and Spanish spoken instructions.',
    icon: '🧱',
    badge: 'Bilingual Activity',
  },
  calibrate_motors: {
    displayName: 'Motor Calibration Wizard',
    category: 'utility',
    description: 'Hardware safety utility for testing, centering, and calibrating servo channel limits.',
    icon: '⚙️',
    badge: 'Hardware Utility',
  },
};

/**
 * Resolves an activity name/filename to formatted metadata.
 */
export function getActivityMetadata(rawName: string): ActivityMetadata {
  const clean = rawName
    .replace(/\.py$/i, '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');

  if (CORE_ACTIVITIES_CATALOG[clean]) {
    return CORE_ACTIVITIES_CATALOG[clean];
  }

  // Handle lesson plans
  if (clean.startsWith('activity_plan_') || clean.startsWith('plan_')) {
    const title = clean
      .replace(/^activity_plan_/, '')
      .replace(/^plan_/, '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      displayName: title || rawName,
      category: 'plan',
      description: 'Structured educational activity plan created via the Lesson Planner.',
      icon: '📚',
      badge: 'Lesson Plan',
    };
  }

  // Handle custom interactions
  if (clean.startsWith('custom_interaction_') || clean.startsWith('interaction_')) {
    const title = clean
      .replace(/^custom_interaction_/, '')
      .replace(/^interaction_/, '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    return {
      displayName: title || rawName,
      category: 'custom',
      description: 'Custom teacher interaction flow created via the Interaction Designer.',
      icon: '🎭',
      badge: 'Custom Interaction',
    };
  }

  // Fallback human-readable formatting
  const formatted = clean
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    displayName: formatted || rawName,
    category: 'utility',
    description: `Executable activity target: ${rawName}`,
    icon: '🚀',
    badge: 'Activity',
  };
}
