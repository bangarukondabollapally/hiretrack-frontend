/**
 * src/lib/motion.js
 * Central shared motion tokens, easings, springs, and reusable framer-motion variants.
 * Follows HireTrack motion design rules: calm, functional, non-looping, transform & opacity only.
 */

export const DURATIONS = {
  fast: 0.15,
  normal: 0.2,
  page: 0.18,
  hero: 0.35,
  landing: 0.4,
  stagger: 0.07,
};

export const EASINGS = {
  easeOut: [0.16, 1, 0.3, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  anticipate: [0.36, 0, 0.66, -0.56],
};

export const SPRINGS = {
  gentle: { type: 'spring', stiffness: 350, damping: 30 },
  snappy: { type: 'spring', stiffness: 450, damping: 35 },
};

export const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.page, ease: EASINGS.easeOut },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: EASINGS.easeOut },
  },
};

export const heroItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATIONS.hero,
      ease: EASINGS.easeOut,
      delay: i * DURATIONS.stagger,
    },
  }),
};

export const viewportRevealVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.landing, ease: EASINGS.easeOut },
  },
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: DURATIONS.stagger,
    },
  },
};

export const listItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATIONS.page, ease: EASINGS.easeOut },
  },
  exit: {
    opacity: 0,
    x: -16,
    transition: { duration: DURATIONS.fast },
  },
};

export const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATIONS.fast } },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

export const modalCardVariants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATIONS.page, ease: EASINGS.easeOut },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    transition: { duration: 0.12 },
  },
};

export const drawerVariants = {
  hidden: { opacity: 0, x: '-100%' },
  visible: {
    opacity: 1,
    x: 0,
    transition: SPRINGS.gentle,
  },
  exit: {
    opacity: 0,
    x: '-100%',
    transition: { duration: DURATIONS.fast },
  },
};

export const popoverVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATIONS.fast, ease: EASINGS.easeOut },
  },
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.12 },
  },
};

export const toastVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURATIONS.page, ease: EASINGS.easeOut },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.97,
    transition: { duration: 0.12 },
  },
};
