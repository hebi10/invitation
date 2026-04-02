'use client';

import GreetingShared, { type GreetingProps } from './GreetingShared';
import styles from './GreetingSimple.module.css';

export default function GreetingSimple(props: GreetingProps) {
  return <GreetingShared {...props} styles={styles} wrapInCard />;
}
