import { sanitizeSvg } from '@/lib/svg';

interface SvgIconProps {
  svg?: string;
  fallback?: string;
  className?: string;
}

export default function SvgIcon({ svg, fallback, className = '' }: SvgIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center text-current [&_svg]:h-3/4 [&_svg]:w-3/4 [&_svg]:fill-current ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg, fallback) }}
    />
  );
}
