import React from "react";
import { motion } from "framer-motion";

const cardVariants = {
  hidden: { opacity: 0, scale: 0.94, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const iconFloat = {
  animate: {
    y: [0, -8, 0],
  },
  transition: {
    duration: 3.2,
    repeat: Infinity,
    ease: "easeInOut",
  },
};

/**
 * Shared glassmorphism empty-state shell.
 * `icon` = primary illustration node (JSX)
 * `badgeIcon` = small secondary Lucide icon shown in the corner chip (optional)
 */
export default function EmptyStateCard({
  icon,
  title,
  subtitle,
  action,
  minHeight = 340,
}) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{
        y: -4,
        boxShadow:
          "0 12px 40px rgba(0,245,160,0.08), 0 0 0 1px rgba(0,245,160,0.15)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      style={{
        position: "relative",
        minHeight,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "0.9rem",
        padding: "2.5rem 1.75rem",
        borderRadius: "18px",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      {/* faint inner glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "60%",
          height: "60%",
          background:
            "radial-gradient(circle, rgba(0,245,160,0.10) 0%, transparent 70%)",
          filter: "blur(30px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={iconFloat.animate}
        transition={iconFloat.transition}
        style={{
          position: "relative",
          width: 84,
          height: 84,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          background:
            "linear-gradient(135deg, rgba(0,245,160,0.14) 0%, rgba(0,245,160,0.03) 100%)",
          border: "1px solid rgba(0,245,160,0.22)",
          marginBottom: "0.3rem",
        }}
      >
        {icon}
      </motion.div>

      <h3
        style={{
          margin: 0,
          fontSize: "1.15rem",
          fontWeight: 700,
          color: "#F2FBF7",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          maxWidth: 300,
          fontSize: "0.88rem",
          lineHeight: 1.5,
          color: "rgba(226, 240, 234, 0.55)",
        }}
      >
        {subtitle}
      </p>

      {action && <div style={{ marginTop: "0.6rem" }}>{action}</div>}
    </motion.div>
  );
}