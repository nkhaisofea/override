"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Shared motion primitives.
 *
 * The reference is Linear's feel. What actually makes that feel work is not
 * the movement — it's the *sequencing*. Elements don't all arrive at once and
 * they don't arrive on a metronome: each one is given a delay chosen for how
 * important it is, so the eye is walked down the page in reading order. A
 * heading lands almost immediately; a footer can afford to be half a second
 * late because nobody is waiting on it.
 *
 * The other half is the glow. Linear reveals a surface with a brief, soft
 * bloom that fades as the element settles, so things look lit rather than
 * merely moved. `Glow` below does that with a box-shadow that animates to
 * transparent — no extra DOM, no filter, and nothing left running afterwards.
 *
 * Restraint still applies. A verdict on a health claim has to read as
 * considered, so there is no bounce, no overshoot and no scale-in pop.
 */

// Roughly ease-out-quart: quick off the mark, long gentle settle. One curve
// used everywhere, which is most of why a set of animations feels coherent.
export const EASE = [0.16, 1, 0.3, 1];

// Slightly softer curve for longer, more deliberate entrances.
export const EASE_SOFT = [0.22, 0.61, 0.36, 1];

export const DURATION = { fast: 0.22, base: 0.42, slow: 0.62, glow: 1.1 };

/**
 * Named delays, so call sites express intent ("this is secondary") rather
 * than sprinkling magic numbers. Spread across the 0.1-0.6s band.
 */
export const DELAY = {
  immediate: 0,
  first: 0.08,
  second: 0.16,
  third: 0.26,
  fourth: 0.36,
  late: 0.46,
  last: 0.58,
};

function useMotionSafe() {
  return !useReducedMotion();
}

/**
 * Fade and lift into place.
 *
 * `y` defaults to 14px — enough to read as arriving, small enough not to look
 * like a slide transition.
 */
export function FadeUp({
  children,
  delay = 0,
  y = 14,
  duration = DURATION.base,
  className = "",
  as = "div",
  ...rest
}) {
  const animate = useMotionSafe();
  const Tag = motion[as] || motion.div;

  return (
    <Tag
      className={className}
      initial={animate ? { opacity: 0, y } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, ease: EASE, delay: animate ? delay : 0 }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A surface that blooms as it arrives: it fades up, and an accent-tinted
 * shadow swells and then falls away to nothing.
 *
 * The glow is deliberately transient. A permanent glow is decoration and
 * competes with the risk colours that actually mean something; a glow that
 * resolves reads as the element switching on.
 */
export function Glow({
  children,
  delay = 0,
  y = 14,
  tint = "29 184 118", // accent, as raw RGB channels for rgb(... / alpha)
  className = "",
  ...rest
}) {
  const animate = useMotionSafe();

  if (!animate) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.fast }}
        {...rest}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, boxShadow: `0 0 0px 0px rgb(${tint} / 0)` }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: [
          `0 0 0px 0px rgb(${tint} / 0)`,
          `0 0 34px 2px rgb(${tint} / 0.22)`,
          `0 0 0px 0px rgb(${tint} / 0)`,
        ],
      }}
      transition={{
        opacity: { duration: DURATION.base, ease: EASE, delay },
        y: { duration: DURATION.base, ease: EASE, delay },
        // The bloom outlasts the movement, so the element is settled by the
        // time the light finishes falling off.
        boxShadow: { duration: DURATION.glow, ease: EASE_SOFT, delay, times: [0, 0.35, 1] },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Parent for a staggered group. Children should be <StaggerItem>.
 *
 * `gap` is the spacing between children. 0.09s reads as "one after another"
 * without the last item feeling late; combined with `delay` this keeps a full
 * page inside the 0.1-0.6s band.
 */
export function Stagger({ children, className = "", delay = 0, gap = 0.09, ...rest }) {
  const animate = useMotionSafe();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: animate ? gap : 0,
            delayChildren: animate ? delay : 0,
          },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "", y = 14, ...rest }) {
  const animate = useMotionSafe();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: animate ? { opacity: 0, y } : { opacity: 0 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: DURATION.base, ease: EASE },
        },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cross-fades between two states in the same slot — used when the result page
 * swaps in a translation. Malay, English, Chinese and Tamil renderings of the
 * same sentence differ enough in length that a hard swap is visibly jarring.
 */
export function CrossFade({ children, motionKey, className = "" }) {
  const animate = useMotionSafe();

  return (
    <motion.div
      key={motionKey}
      className={className}
      initial={animate ? { opacity: 0, y: 6 } : { opacity: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.fast, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Press feedback for tappable surfaces. Transform only, so it composes with
 * whatever Tailwind hover styles the element already carries.
 */
export function Pressable({ children, className = "", disabled = false, ...rest }) {
  const animate = useMotionSafe();

  return (
    <motion.div
      className={className}
      whileHover={animate && !disabled ? { y: -2 } : undefined}
      whileTap={animate && !disabled ? { scale: 0.985 } : undefined}
      transition={{ duration: DURATION.fast, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
