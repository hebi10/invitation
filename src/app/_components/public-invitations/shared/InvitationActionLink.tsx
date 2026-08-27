import type { ReactNode } from 'react';

import styles from './InvitationActionLink.module.css';

type InvitationActionLinkProps = {
  href: string;
  children: ReactNode;
  external?: boolean;
};

export function InvitationActionLink({
  href,
  children,
  external = false,
}: InvitationActionLinkProps) {
  return (
    <a
      className={styles.link}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      {children}
    </a>
  );
}
