/**
 * DUKAAN UI kit — barrel export.
 *
 * Phase A2: reusable, design-spec-accurate primitives built on the A1 tokens.
 * These are NOT wired into any screen yet; screens adopt them during Phase B.
 *
 *   import {Button, Card, Badge, AppText} from '../components/ui';
 */
export {AppText} from './Text';
export type {TextVariant} from './Text';

export {Button, IconButton} from './Button';
export type {ButtonVariant, ButtonSize, IconButtonVariant} from './Button';

export {Card} from './Card';
export {Row, RowThumb} from './Row';

export {Field, Input, Textarea} from './Input';
export {Select} from './Select';
export {Toggle} from './Toggle';

export {Segmented} from './Segmented';
export type {SegmentOption} from './Segmented';

export {Stepper} from './Stepper';
export {Badge} from './Badge';
export type {BadgeVariant} from './Badge';
export {Chip} from './Chip';

export {TopBar} from './TopBar';
export {BottomSheet, CenterModal} from './Sheet';

export {Icon} from './Icon';
export type {IconName} from './Icon';
