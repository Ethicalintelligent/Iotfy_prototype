// The original's icon component: the same SVG as the kit's Icon, but it also passes on extra
// props (the page rotates some icons with `style`).
import { createElement, type SVGProps } from 'react';
import { ICONS } from '../smart-track/icons';
import { TRACKING_ICONS } from './icons';

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  className,
  ...rest
}: { name: string; size?: number; strokeWidth?: number; className?: string } & Omit<
  SVGProps<SVGSVGElement>,
  'name'
>) {
  const nodes = ICONS[name] ?? TRACKING_ICONS[name] ?? ICONS.CircleDot ?? [];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ? `lucide ${className}` : 'lucide'}
      aria-hidden="true"
      {...rest}
    >
      {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
