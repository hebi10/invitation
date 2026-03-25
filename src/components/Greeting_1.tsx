'use client';

import GreetingShared, { type GreetingProps } from './GreetingShared';
import styles from './Greeting_1.module.css';

export default function Greeting_1(props: GreetingProps) {
  return <GreetingShared {...props} styles={styles} wrapInCard />;
}
