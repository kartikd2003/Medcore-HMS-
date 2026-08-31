/**
 * The one signature visual element for MedCore HMS: a single subtle
 * waveform stroke, evoking a vitals trace without being a literal
 * cliché EKG graphic. Used sparingly — as a section divider or a
 * loading indicator — never repeated decoratively across a page.
 */
export function PulseLine({
  className = '',
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 24"
      className={className}
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 12 H80 L92 12 L100 4 L108 20 L116 12 L128 12 H240"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'animate-pulse-draw' : undefined}
      />
    </svg>
  );
}
