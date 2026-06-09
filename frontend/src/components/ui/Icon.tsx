/**
 * Icon — the DUKAAN line-icon set (Phase A4).
 *
 * A single SVG primitive (react-native-svg) that renders any named 2px line
 * icon. Replaces the emoji / unicode / drawn-View glyphs used before A4. Icons
 * are stroke-only on a 24×24 grid with round caps/joins, so colour + weight come
 * from `color` / `strokeWidth` and inherit the surrounding text colour intent.
 *
 *   <Icon name="scan" size={26} color="#fff" />
 *
 * To add an icon: add its name to `IconName` and a path entry to `ICON_PATHS`.
 */
import React from 'react';
import {Circle, G, Path, Rect, Svg} from 'react-native-svg';
import {DukaanColors} from '../../constants/theme';

export type IconName =
  // Navigation + core UI
  | 'home'
  | 'grid'
  | 'receipt'
  | 'settings'
  | 'scan'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'minus'
  | 'plus'
  | 'check'
  | 'close'
  | 'search'
  | 'trash'
  | 'edit'
  | 'share'
  | 'whatsapp'
  | 'cart'
  | 'box'
  | 'flash'
  | 'tag'
  | 'layers'
  | 'tools'
  // Business-type glyphs (onboarding / settings)
  | 'store'
  | 'medical'
  | 'shirt'
  | 'shoe'
  | 'ball'
  | 'wrench'
  | 'monitor'
  | 'utensils';

interface IconProps {
  name: IconName;
  /** Square size in px. Default 24. */
  size?: number;
  /** Stroke colour. Default ink. */
  color?: string;
  /** Stroke width in the 24-grid. Default 2. */
  strokeWidth?: number;
}

/**
 * Inner SVG elements per icon. The shared <G> sets stroke/fill/caps, so each
 * path only needs its `d` (a few icons add a filled dot via `fill`).
 */
const ICON_PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <Path d="M3 11.5 12 4l9 7.5" />
      <Path d="M5.5 10v9.5h13V10" />
    </>
  ),
  grid: (
    <>
      <Rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <Rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <Rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <Rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  receipt: (
    <>
      <Path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4V3.5z" />
      <Path d="M9 8.5h6M9 12.5h6" />
    </>
  ),
  settings: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  scan: (
    <>
      <Path d="M8 3.5H4.5a1 1 0 0 0-1 1V8M16 3.5h3.5a1 1 0 0 1 1 1V8M8 20.5H4.5a1 1 0 0 1-1-1V16M16 20.5h3.5a1 1 0 0 0 1-1V16" />
      <Path d="M3.5 12h17" />
    </>
  ),
  'chevron-down': <Path d="M6 9.5l6 6 6-6" />,
  'chevron-left': <Path d="M14.5 6l-6 6 6 6" />,
  'chevron-right': <Path d="M9.5 6l6 6-6 6" />,
  minus: <Path d="M5 12h14" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M16.5 16.5L21 21" />
    </>
  ),
  trash: (
    <>
      <Path d="M3.5 6h17M9 6V4h6v2M5.5 6l1 13.5a1 1 0 0 0 1 .9h9a1 1 0 0 0 1-.9L18.5 6" />
      <Path d="M10 10.5v6M14 10.5v6" />
    </>
  ),
  edit: (
    <>
      <Path d="M4 20h4L19.5 8.5a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z" />
      <Path d="M14 6.5l3.5 3.5" />
    </>
  ),
  share: (
    <>
      <Circle cx="18" cy="5.5" r="2.6" />
      <Circle cx="6" cy="12" r="2.6" />
      <Circle cx="18" cy="18.5" r="2.6" />
      <Path d="M8.3 10.7l7.4-4.2M8.3 13.3l7.4 4.2" />
    </>
  ),
  whatsapp: (
    <>
      <Path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z" />
      <Path d="M9 9c0 3 2.8 5.8 5.8 5.8.5 0 1-.6 1.2-1.1l-1.8-1-.9.8c-.8-.4-1.6-1.2-2-2l.8-.9-1-1.8C10.6 8 9.9 8.5 9 9z" />
    </>
  ),
  flash: <Path d="M13 2.5 5 13h6l-1 8.5L18 11h-6l1-8.5z" />,
  cart: (
    <>
      <Path d="M2.5 3.5h2.2l2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L19.5 7H6" />
      <Circle cx="9" cy="20" r="1.4" />
      <Circle cx="17" cy="20" r="1.4" />
    </>
  ),
  box: (
    <>
      <Path d="M3.5 7.5l8.5-4 8.5 4v9l-8.5 4-8.5-4v-9z" />
      <Path d="M3.5 7.5l8.5 4 8.5-4M12 11.5v9" />
    </>
  ),
  tag: (
    <>
      <Path d="M3.5 12.5l8-8H18a2.5 2.5 0 0 1 2.5 2.5v6.5l-8 8a1.5 1.5 0 0 1-2.1 0l-6.9-6.9a1.5 1.5 0 0 1 0-2.1z" />
      <Circle cx="16" cy="8" r="1.3" />
    </>
  ),
  layers: (
    <>
      <Path d="M12 3.5l9 5-9 5-9-5 9-5z" />
      <Path d="M3 13l9 5 9-5" />
    </>
  ),
  tools: (
    <>
      <Path d="M14.5 6.5a3.5 3.5 0 0 0 4.4 4.4L21 13l-3 3-2.1-2.1a3.5 3.5 0 0 0-4.4-4.4L9 7l3-3 2.5 2.5z" />
      <Path d="M9.5 14.5L4 20" />
    </>
  ),
  store: (
    <>
      <Path d="M4 9.5l1.4-5h13.2L20 9.5M4.5 9.5h15v10h-15z" />
      <Path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0M10 19.5v-5h4v5" />
    </>
  ),
  medical: (
    <>
      <Rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <Path d="M12 8v8M8 12h8" />
    </>
  ),
  shirt: (
    <>
      <Path d="M8.5 3.5l-5 2.5 1.8 3.5L8 8.5V20h8V8.5l2.7.9 1.8-3.4-5-2.5" />
      <Path d="M8.5 3.5a3.5 3.5 0 0 0 7 0" />
    </>
  ),
  shoe: (
    <>
      <Path d="M3 16.5v-5l4-1 3 3 7 1.5a3 3 0 0 1 2.8 2.5l.2 1.5H3.5a.5.5 0 0 1-.5-.5z" />
      <Path d="M7 10.5l1.5 2M10.5 11.5l1.5 1.8" />
    </>
  ),
  ball: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 3.5v17M3.5 12h17M5.5 6.5c3 2 10 2 13 0M5.5 17.5c3-2 10-2 13 0" />
    </>
  ),
  wrench: (
    <Path d="M15 3.5a5 5 0 0 0 6 6l-9.5 9.5a2.5 2.5 0 0 1-3.5-3.5L17.5 6a5 5 0 0 1-2.5-2.5z" />
  ),
  monitor: (
    <>
      <Rect x="3" y="4" width="18" height="12.5" rx="2" />
      <Path d="M9 20.5h6M12 16.5v4" />
    </>
  ),
  utensils: (
    <>
      <Path d="M6 3v7M4 3v4a2 2 0 0 0 4 0V3M6 10v11" />
      <Path d="M17 3c-1.8 0-3 2-3 4.5S15 12 17 12v9" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  color = DukaanColors.ink,
  strokeWidth = 2,
}: IconProps): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none">
        {ICON_PATHS[name]}
      </G>
    </Svg>
  );
}
