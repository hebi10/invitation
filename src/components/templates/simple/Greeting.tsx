'use client';

import GreetingShared, { type GreetingProps } from '@/components/shared/GreetingShared';
import styles from './Greeting.module.css';

export default function Greeting(props: GreetingProps) {
  return <GreetingShared {...props} styles={styles} wrapInCard />;
}
