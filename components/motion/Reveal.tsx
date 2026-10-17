import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

/** Static wrapper. Scroll motion is the CSS view timeline on [data-reveal]. */
export function Reveal({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
