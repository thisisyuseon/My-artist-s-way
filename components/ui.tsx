"use client";

import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export const PM = "#ED93B1", PD = "#993556", PB = "#F4C0D1";
export const GM = "#97C459", GD = "#3B6D11", GB = "#C0DD97";
export const BG = "#fdf8f5", MUT = "#888";

// ── Tag 버튼 ──────────────────────────────────────────────────────────
interface TagProps {
  label: string;
  active: boolean;
  onClick: () => void;
  ac?: string;
  bc?: string;
}
export function Tag({ label, active, onClick, ac = PM, bc = PB }: TagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors"
      style={{
        border: `1px solid ${active ? ac : bc}`,
        background: active ? ac : "#fff",
        color: active ? "#fff" : MUT,
      }}
    >
      {label}
    </button>
  );
}

// ── 텍스트 입력 ───────────────────────────────────────────────────────
interface InpProps {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  type?: string;
}
export function Inp({ placeholder, value, onChange, rows, type = "text" }: InpProps) {
  const base: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${PB}`,
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 15,
    background: "#fff",
    outline: "none",
    boxSizing: "border-box",
    color: "inherit",
    fontFamily: "inherit",
  };
  return rows ? (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...base, lineHeight: 1.7, resize: "vertical" }}
    />
  ) : (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={base}
    />
  );
}

// ── フィールドラベル ──────────────────────────────────────────────────
export function FieldLbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: MUT, margin: "0 0 6px", fontWeight: 500 }}>{label}</p>
      {children}
    </div>
  );
}

// ── カード ────────────────────────────────────────────────────────────
export function Card({
  children, bc = PB, style = {},
}: { children: React.ReactNode; bc?: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${bc}`,
        borderRadius: 14,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── 戻るボタン ────────────────────────────────────────────────────────
export function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer", color: PD, fontSize: 14, marginBottom: 16, padding: 0 }}
    >
      ← 홈으로
    </button>
  );
}

// ── 저장 버튼 ─────────────────────────────────────────────────────────
interface SaveBtnProps {
  onClick: () => void;
  disabled?: boolean;
  saving?: boolean;
  msg?: string;
  label: string;
}
export function SaveBtn({ onClick, disabled, saving, msg, label }: SaveBtnProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || saving}
        style={{
          width: "100%",
          padding: "12px 0",
          background: msg?.startsWith("✓") ? GM : PM,
          color: "#fff",
          border: "none",
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 500,
          cursor: "pointer",
          opacity: disabled || saving ? 0.7 : 1,
          fontFamily: "inherit",
        }}
      >
        {saving ? "저장 중..." : label}
      </button>
      {msg && (
        <p style={{ fontSize: 13, color: msg.startsWith("✓") ? GD : PD, textAlign: "center", marginTop: 8, marginBottom: 0 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
