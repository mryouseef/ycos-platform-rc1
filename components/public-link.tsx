/** M-04: public static navigation uses local anchors and has no router-context dependency. */
import type { AnchorHTMLAttributes, ReactNode } from "react";
export function PublicLink({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) { return <a {...props}>{children}</a>; }
