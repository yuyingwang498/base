// SVG field type icons matching Lark Base style
// 16×16 viewBox, stroke-based, 1.5px stroke

import { FieldType } from "../../types";

interface IconProps {
  size?: number;
  className?: string;
}

const s = { strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none", stroke: "currentColor" };

const ICONS: Record<string, (p: IconProps) => JSX.Element> = {
  // ── Basic ──
  Text: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M3 4h10M3 8h7M3 12h5" {...s}/></svg>
  ),
  Number: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M5.5 2.5l-1 11M11.5 2.5l-1 11M2 6h12M2 10h12" {...s}/></svg>
  ),
  SingleSelect: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="8" cy="8" r="5.5" {...s}/><circle cx="8" cy="8" r="2" fill="currentColor" stroke="none"/></svg>
  ),
  MultiSelect: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2.5" y="2.5" width="11" height="11" rx="2" {...s}/><path d="M5 8l2 2 4-4" {...s}/></svg>
  ),
  User: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="8" cy="5.5" r="2.5" {...s}/><path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" {...s}/></svg>
  ),
  DateTime: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="3" width="12" height="11" rx="1.5" {...s}/><path d="M5 1.5v3M11 1.5v3M2 7h12" {...s}/></svg>
  ),
  Attachment: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M13.5 7.5l-5.3 5.3a3 3 0 01-4.2-4.2l5.3-5.3a2 2 0 012.8 2.8L6.8 11.4a1 1 0 01-1.4-1.4L10.7 4.7" {...s}/></svg>
  ),
  Checkbox: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2.5" y="2.5" width="11" height="11" rx="2" {...s}/><path d="M5 8l2 2 4-4" {...s}/></svg>
  ),
  Stage: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M2 8h3l2-3 2 6 2-3h3" {...s}/></svg>
  ),
  AutoNumber: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M4 12V5l-2 2" {...s}/><path d="M7 12h1.5c1.4 0 2.5-1.1 2.5-2.5S9.9 7 8.5 7H8l3-3" {...s}/><circle cx="12" cy="10" r="1" fill="currentColor" stroke="none"/></svg>
  ),
  Url: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M6.5 9.5a3 3 0 004 .5l1.5-1.5a3 3 0 00-4.2-4.2L6.5 5.5" {...s}/><path d="M9.5 6.5a3 3 0 00-4-.5L4 7.5a3 3 0 004.2 4.2l1.3-1.2" {...s}/></svg>
  ),
  Phone: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M5 2.5h6a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" {...s}/><path d="M7 11.5h2" {...s}/></svg>
  ),
  Email: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="3.5" width="12" height="9" rx="1.5" {...s}/><path d="M2 4.5l6 4 6-4" {...s}/></svg>
  ),
  Location: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M8 14s-4.5-3.5-4.5-7a4.5 4.5 0 019 0c0 3.5-4.5 7-4.5 7z" {...s}/><circle cx="8" cy="7" r="1.5" {...s}/></svg>
  ),
  Barcode: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M2 3v10M5 3v10M7 3v10M10 3v10M12 3v10M14 3v10" {...s} strokeWidth="1"/></svg>
  ),
  Progress: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="6" width="12" height="4" rx="2" {...s}/><rect x="2" y="6" width="7" height="4" rx="2" fill="currentColor" stroke="none" opacity="0.3"/></svg>
  ),
  Currency: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M8 2v12M5 5.5C5 4.1 6.3 3 8 3s3 1.1 3 2.5S9.7 8 8 8s-3 1.1-3 2.5S6.3 13 8 13s3-1.1 3-2.5" {...s}/></svg>
  ),
  Rating: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M8 1.5l2 4 4.5.7-3.2 3.1.8 4.4L8 11.5l-4 2.2.8-4.4L1.5 6.2 6 5.5z" {...s}/></svg>
  ),

  // ── System ──
  CreatedUser: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="7" cy="5.5" r="2.5" {...s}/><path d="M2 14c0-2.8 2.2-5 5-5s5 2.2 5 5" {...s}/><path d="M12 3v4M10 5h4" {...s}/></svg>
  ),
  ModifiedUser: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="7" cy="5.5" r="2.5" {...s}/><path d="M2 14c0-2.8 2.2-5 5-5s5 2.2 5 5" {...s}/><path d="M11 3l2.5 2.5M14 5l-3.5 3.5L9 9l.5-1.5L13 4" {...s}/></svg>
  ),
  CreatedTime: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="8" cy="8" r="6" {...s}/><path d="M8 4.5V8l2.5 1.5" {...s}/></svg>
  ),
  ModifiedTime: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="8" cy="8" r="6" {...s}/><path d="M8 4.5V8l2.5 1.5" {...s}/><path d="M12.5 12.5l1.5 1.5" {...s}/></svg>
  ),

  // ── Extended ──
  Formula: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M4 3h5.5a2.5 2.5 0 010 5H6M4 13h5.5a2.5 2.5 0 000-5H6" {...s}/><path d="M3 8h7" {...s}/></svg>
  ),
  SingleLink: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="1.5" y="4" width="5" height="8" rx="1" {...s}/><rect x="9.5" y="4" width="5" height="8" rx="1" {...s}/><path d="M6.5 8h3" {...s}/><path d="M8.5 6l2 2-2 2" {...s}/></svg>
  ),
  DuplexLink: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="1.5" y="4" width="5" height="8" rx="1" {...s}/><rect x="9.5" y="4" width="5" height="8" rx="1" {...s}/><path d="M6.5 7h3M6.5 9h3" {...s}/><path d="M8.5 5.5l1.5 1.5-1.5 1.5M7.5 10.5L6 9l1.5-1.5" {...s}/></svg>
  ),
  Lookup: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="3" width="8" height="7" rx="1" {...s}/><circle cx="12" cy="11" r="2.5" {...s}/><path d="M14 13l-1-1" {...s}/></svg>
  ),

  // ── AI ──
  ai_summary: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="2" width="12" height="12" rx="2" {...s}/><path d="M5 5h6M5 8h4M5 11h2" {...s}/></svg>
  ),
  ai_transition: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M2 5h5M9 5h5M2 8h12M2 11h5M9 11h5" {...s}/><path d="M7.5 3.5l1 3-1 3" {...s} strokeWidth="1"/></svg>
  ),
  ai_extract: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><rect x="2" y="2" width="12" height="12" rx="2" {...s}/><path d="M5 6h6M5 9h3" {...s}/><path d="M10 9l2 2M10 11l2-2" {...s}/></svg>
  ),
  ai_classify: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><circle cx="5" cy="5" r="2.5" {...s}/><circle cx="11" cy="5" r="2.5" {...s}/><circle cx="8" cy="11.5" r="2.5" {...s}/></svg>
  ),
  ai_tag: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M2 8.6V3a1 1 0 011-1h5.6a1 1 0 01.7.3l5.4 5.4a1 1 0 010 1.4l-5.6 5.6a1 1 0 01-1.4 0L2.3 9.3a1 1 0 01-.3-.7z" {...s}/><circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none"/></svg>
  ),
  ai_custom: ({ size = 16, className }) => (
    <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M8 1.5l1.5 3 3.5.5-2.5 2.4.6 3.4L8 9.5l-3.1 1.8.6-3.4L3 5.5l3.5-.5z" {...s}/><path d="M4 13h8" {...s}/></svg>
  ),
};

// Fallback icon
const FallbackIcon = ({ size = 16, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" className={className}><path d="M3 4h10M3 8h10M3 12h6" {...s}/></svg>
);

export function FieldIcon({ type, size = 16, className }: { type: FieldType | string; size?: number; className?: string }) {
  const Icon = ICONS[type] ?? FallbackIcon;
  return <Icon size={size} className={className} />;
}
