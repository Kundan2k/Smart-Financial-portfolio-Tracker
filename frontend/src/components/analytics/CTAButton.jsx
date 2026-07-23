import React from "react";
import { motion } from "framer-motion";

/**
 * Reusable glowing CTA button.
 * Default: "+ Add Transaction" → navigates to /expenses
 */
export default function CTAButton({
  label = "+ Add Transaction",
  to = "/expenses",
  onNavigate,
}) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(to);
    } else if (typeof window !== "undefined") {
      window.location.href = to;
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      whileHover={{
        scale: 1.045,
        boxShadow:
          "0 0 18px rgba(0,245,160,0.55), 0 0 42px rgba(0,245,160,0.35)",
      }}
      whileTap={{ scale: 0.97 }}
      animate={{
        boxShadow: [
          "0 0 10px rgba(0,245,160,0.25), 0 0 22px rgba(0,245,160,0.12)",
          "0 0 16px rgba(0,245,160,0.4), 0 0 30px rgba(0,245,160,0.2)",
          "0 0 10px rgba(0,245,160,0.25), 0 0 22px rgba(0,245,160,0.12)",
        ],
      }}
      transition={{
        boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
        scale: { type: "spring", stiffness: 300, damping: 18 },
      }}
      style={{
        background: "linear-gradient(135deg, #00F5A0 0%, #00C285 100%)",
        color: "#03130D",
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: "0.01em",
        border: "none",
        borderRadius: "14px",
        padding: "0.85rem 1.6rem",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      {label}
    </motion.button>
  );
}