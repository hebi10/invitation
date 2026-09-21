'use client';

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import styles from './WizardFieldValidation.module.css';

const ValidationContext = createContext<readonly string[]>([]);

export function WizardFieldValidationProvider({
  messages,
  enabled,
  children,
}: {
  messages: readonly string[];
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <ValidationContext.Provider value={enabled ? messages : []}>
      {children}
    </ValidationContext.Provider>
  );
}

/** Match existing validation copy without replacing the authoritative step checks. */
export function getWizardFieldMessages(label: string, messages: readonly string[]) {
  return messages.filter((message) => {
    if (/날짜|시간/.test(label) && /날짜와 시간/.test(message)) return true;
    if (label === '주소' || /장소 주소|매장 주소|예식장 주소/.test(label)) {
      return /주소를 입력|주소 검색|지도 좌표/.test(message);
    }
    if (/연락처/.test(label)) return /연락처 형식/.test(message);
    if (/인사말|초대 문구/.test(label) && !/서명/.test(label)) {
      return /^(인사말|초대 문구)을?를? 입력/.test(message);
    }
    if (/장소.*이름|장소명|예식장 이름|매장명/.test(label)) {
      return /장소명을 입력|예식장 이름을 입력|매장명을 입력/.test(message);
    }
    return message.startsWith(`${label}을 `) || message.startsWith(`${label}를 `);
  });
}

type ControlProps = {
  'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
  'aria-describedby'?: string;
};

/** A label for one direct native form control, with its error immediately below it. */
export function WizardField({
  label,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement> & { label: string; children: ReactNode }) {
  const messages = useContext(ValidationContext);
  const errorId = useId();
  const errors = getWizardFieldMessages(label, messages);
  let linked = false;
  const fields = Children.map(children, (child) => {
    if (
      linked || !isValidElement<ControlProps>(child) ||
      !['input', 'textarea', 'select'].includes(String(child.type))
    ) return child;
    linked = true;
    if (!errors.length) return child;
    return cloneElement(child, {
      'aria-invalid': true,
      'aria-describedby': [child.props['aria-describedby'], errorId].filter(Boolean).join(' '),
    });
  });

  return (
    <label {...props}>
      {fields}
      {errors.length > 0 && linked ? (
        <span id={errorId} className={styles.error}>
          {errors.join(' ')}
        </span>
      ) : null}
    </label>
  );
}
