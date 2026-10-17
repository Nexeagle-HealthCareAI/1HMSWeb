import type { GuideStep } from './types';

/** The step sentence with `{label}` replaced by the label as the screen shows it (in bold). */
export function stepText(step: GuideStep, shown?: string | null): string {
  const label = (shown && shown.trim()) || step.target?.label || '';
  return step.say.replace(/\{label\}/g, label ? `**${label.replace(/\*/g, '')}**` : '');
}

export const GUIDE_T = {
  en: {
    guide: 'Guide me',
    ask: 'Ask',
    modeHint: 'Guide me: Vita shows each step on the screen.',
    step: (i: number, n: number) => `Step ${i} of ${n}`,
    back: 'Back',
    next: 'Next',
    skip: 'Skip',
    stop: 'Stop',
    takeMe: (label: string) => `Take me to ${label}`,
    wrongScreen: (label: string) => `This step is on the ${label} screen.`,
    missing: "I can't see it on the screen right now. It may be in a menu or further down. Do it as described, then press Next.",
    optional: 'Optional',
    done: 'Done! 🎉',
    doneSub: 'You finished all the steps.',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    thanks: 'Thanks!',
    close: 'Close',
    showMe: 'Show me on screen',
    generated: 'Steps written by Vita from the 1HMS guide. Check before saving.',
  },
  hi: {
    guide: 'स्क्रीन पर दिखाओ',
    ask: 'पूछें',
    modeHint: 'स्क्रीन पर दिखाओ: Vita हर कदम स्क्रीन पर दिखाएगी।',
    step: (i: number, n: number) => `चरण ${i} / ${n}`,
    back: 'पीछे',
    next: 'आगे',
    skip: 'छोड़ें',
    stop: 'बंद करें',
    takeMe: (label: string) => `${label} पर ले चलो`,
    wrongScreen: (label: string) => `यह चरण ${label} स्क्रीन पर है।`,
    missing: 'यह अभी स्क्रीन पर नहीं दिख रहा। शायद किसी मेन्यू में या नीचे है। बताए अनुसार करें, फिर आगे दबाएँ।',
    optional: 'वैकल्पिक',
    done: 'हो गया! 🎉',
    doneSub: 'आपने सारे चरण पूरे कर लिए।',
    helpful: 'मददगार',
    notHelpful: 'मददगार नहीं',
    thanks: 'धन्यवाद!',
    close: 'बंद करें',
    showMe: 'स्क्रीन पर दिखाओ',
    generated: 'ये चरण Vita ने 1HMS गाइड से बनाए हैं। सेव करने से पहले जाँच लें।',
  },
};

export type GuideStrings = (typeof GUIDE_T)['en'];
