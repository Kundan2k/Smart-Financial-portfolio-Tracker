import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  PieChart,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  Receipt,
  Sparkles,
} from "lucide-react";

import AmbientBackground from "./AmbientBackground";
import EmptyStateCard from "./EmptyStateCard";
import CTAButton from "./CTAButton";

// Replace these with your real chart components — logic untouched.
// import IncomeVsExpensesChart from "./charts/IncomeVsExpensesChart";
// import SpendingByCategoryChart from "./charts/SpendingByCategoryChart";
// import CategorySpendingList from "./charts/CategorySpendingList";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

/**
 * AnalyticsSection
 *
 * Props (unchanged from existing API contract):
 *  - monthly: array   → income/expense trend data, drives "Income vs Expenses"
 *  - by_category: array → category breakdown data, drives the two category cards
 *  - IncomeVsExpensesChart / SpendingByCategoryChart / CategorySpendingList:
 *      optional chart component overrides so this file can be dropped in
 *      without touching your existing chart implementations.
 */
export default function AnalyticsSection({
  monthly = [],
  by_category = [],
  IncomeVsExpensesChart,
  SpendingByCategoryChart,
  CategorySpendingList,
  onNavigate,
}) {
  const hasMonthly = monthly.length > 0;
  const hasCategory = by_category.length > 0;

  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        padding: "2rem 1.5rem 3rem",
        background: "#05080A",
        overflow: "hidden",
        borderRadius: "24px",
      }}
    >
      <AmbientBackground />

      <div style={{ position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            marginBottom: "1.75rem",
          }}
        >
          <Sparkles size={20} color="#00F5A0" />
          <h2
            style={{
              margin: 0,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#F2FBF7",
              letterSpacing: "-0.02em",
            }}
          >
            Analytics
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={gridStyle}
        >
          {/* ---------------- Income vs Expenses ---------------- */}
          <div style={cardSlot}>
            <AnimatePresence mode="wait">
              {!hasMonthly ? (
                <EmptyStateCard
                  key="empty-income-expenses"
                  icon={<IncomeExpenseIllustration />}
                  title="No Financial Data Yet"
                  subtitle="Add your first income or expense to see monthly trends."
                  action={
                    <CTAButton to="/expenses" onNavigate={onNavigate} />
                  }
                  minHeight={380}
                />
              ) : IncomeVsExpensesChart ? (
                <motion.div
                  key="chart-income-expenses"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <IncomeVsExpensesChart monthly={monthly} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ---------------- Spending by Category ---------------- */}
          <div style={cardSlot}>
            <AnimatePresence mode="wait">
              {!hasCategory ? (
                <EmptyStateCard
                  key="empty-spending-category"
                  icon={<PieChart size={34} color="#00F5A0" strokeWidth={1.6} />}
                  title="No category data available"
                  subtitle="Expense categories will appear after recording transactions."
                />
              ) : SpendingByCategoryChart ? (
                <motion.div
                  key="chart-spending-category"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <SpendingByCategoryChart by_category={by_category} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ---------------- Category Spending (ranked list) ---------------- */}
          <div style={cardSlot}>
            <AnimatePresence mode="wait">
              {!hasCategory ? (
                <EmptyStateCard
                  key="empty-category-spending"
                  icon={<RankedListIllustration />}
                  title="No spending history found."
                  subtitle="Start tracking your expenses to unlock spending insights."
                />
              ) : CategorySpendingList ? (
                <motion.div
                  key="list-category-spending"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <CategorySpendingList by_category={by_category} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Illustrations ---------------- */

function IncomeExpenseIllustration() {
  return (
    <div style={{ position: "relative", width: 40, height: 40 }}>
      <BarChart3
        size={38}
        color="#00F5A0"
        strokeWidth={1.6}
        style={{ position: "absolute", top: 0, left: 0 }}
      />
      <TrendingUp
        size={20}
        color="#F2FBF7"
        strokeWidth={2}
        style={{
          position: "absolute",
          bottom: -6,
          right: -10,
          background: "#05080A",
          borderRadius: "50%",
          padding: 2,
        }}
      />
    </div>
  );
}

function RankedListIllustration() {
  return (
    <div style={{ position: "relative", width: 40, height: 40 }}>
      <Receipt
        size={36}
        color="#00F5A0"
        strokeWidth={1.6}
        style={{ position: "absolute", top: 0, left: 2 }}
      />
      <CircleDollarSign
        size={18}
        color="#F2FBF7"
        strokeWidth={2}
        style={{
          position: "absolute",
          bottom: -4,
          right: -8,
          background: "#05080A",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}

/* ---------------- Layout styles ---------------- */

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "1.5rem",
  alignItems: "stretch",
};

const cardSlot = {
  minWidth: 0,
};

/* ---------------- Responsive behavior ----------------
   Desktop  (>1024px): 3 columns, cards stay large
   Tablet   (641–1024px): cards stack to 1 column, full width
   Mobile   (<=640px): single column, centered, generous padding

   Since this file uses inline styles for portability, add the following
   to your global stylesheet (or convert gridStyle to a CSS module) to
   activate the breakpoints:

   @media (max-width: 1024px) {
     .analytics-grid { grid-template-columns: 1fr !important; }
   }
   @media (max-width: 640px) {
     .analytics-grid { padding: 1rem !important; gap: 1rem !important; }
   }
------------------------------------------------------- */