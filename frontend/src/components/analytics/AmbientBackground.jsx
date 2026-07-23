import React from "react";
import { motion } from "framer-motion";

/**
 * Subtle floating blurred circles for ambient depth.
 * Pure CSS transforms via Framer Motion — GPU-accelerated, no layout thrash.
 */
export default function AmbientBackground() {
  const blobs = [
    { size: 380, top: "-8%", left: "8%", color: "#00F5A0", dur: 22, delay: 0 },
    { size: 300, top: "55%", left: "78%", color: "#00C2FF", dur: 26, delay: 2 },
    { size: 260, top: "75%", left: "15%", color: "#00F5A0", dur: 30, delay: 4 },
    { size: 220, top: "10%", left: "70%", color: "#7C4DFF", dur: 24, delay: 1 },
  ];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
          }}
          transition={{
            duration: b.dur,
            delay: b.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: b.color,
            opacity: 0.06,
            filter: "blur(70px)",
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}