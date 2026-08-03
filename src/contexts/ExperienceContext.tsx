'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { buildAppRoutes, type AppRoutes } from '@/lib/demoExperienceRoutes';
import type {
  DemoExperienceRole,
  DemoExperienceSessionSnapshot,
} from '@/types/demoExperience';

export interface ExperienceContextValue {
  session: DemoExperienceSessionSnapshot;
  switchRole(role: DemoExperienceRole): Promise<void>;
  endExperience(): Promise<void>;
  routes: AppRoutes;
}

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

type SessionPayload = {
  authenticated?: boolean;
  session?: DemoExperienceSessionSnapshot;
  code?: string;
  error?: string;
};

async function readSessionPayload(response: Response) {
  return (await response.json().catch(() => null)) as SessionPayload | null;
}

function isSessionSnapshot(value: unknown): value is DemoExperienceSessionSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const session = value as Record<string, unknown>;
  return (
    typeof session.sessionId === 'string' &&
    (session.role === 'admin' || session.role === 'customer') &&
    typeof session.dateKey === 'string' &&
    typeof session.expiresAt === 'number'
  );
}

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const routes = useMemo(() => buildAppRoutes('experience'), []);
  const [session, setSession] = useState<DemoExperienceSessionSnapshot | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const startFreshSession = useCallback(async () => {
    const response = await fetch('/api/experience/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const payload = await readSessionPayload(response);
    if (!response.ok || !isSessionSnapshot(payload?.session)) {
      throw new Error(payload?.error || '체험 세션을 다시 시작하지 못했습니다.');
    }
    queryClient.clear();
    setSession(payload.session);
    router.replace(`${routes.admin()}?reset=1`);
  }, [queryClient, router, routes]);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const response = await fetch('/api/experience/session', {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = await readSessionPayload(response);
      if (cancelled) return;

      if (response.status === 410 || payload?.code === 'DEMO_DAY_ROLLED_OVER') {
        try {
          await startFreshSession();
        } catch (error) {
          if (!cancelled) {
            setErrorMessage(error instanceof Error ? error.message : '체험을 준비하지 못했습니다.');
          }
        }
        return;
      }
      if (!response.ok || !isSessionSnapshot(payload?.session)) {
        router.replace(routes.home());
        return;
      }
      setSession(payload.session);
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [router, routes, startFreshSession]);

  useEffect(() => {
    if (!session) return;
    const delay = Math.max(0, session.expiresAt * 1000 - Date.now());
    const timeoutId = window.setTimeout(() => {
      void startFreshSession().catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : '체험을 다시 시작하지 못했습니다.');
      });
    }, delay);
    return () => window.clearTimeout(timeoutId);
  }, [session, startFreshSession]);

  const switchRole = useCallback(
    async (role: DemoExperienceRole) => {
      if (session?.role === role) return;
      const response = await fetch('/api/experience/session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const payload = await readSessionPayload(response);
      if (!response.ok || !isSessionSnapshot(payload?.session)) {
        throw new Error(payload?.error || '체험 역할을 변경하지 못했습니다.');
      }
      queryClient.clear();
      setSession(payload.session);
      router.push(role === 'admin' ? routes.admin() : routes.customerDashboard());
    },
    [queryClient, router, routes, session?.role]
  );

  const endExperience = useCallback(async () => {
    await fetch('/api/experience/session', { method: 'DELETE' }).catch(() => null);
    queryClient.clear();
    router.replace(routes.home());
  }, [queryClient, router, routes]);

  const value = useMemo<ExperienceContextValue | null>(
    () =>
      session
        ? { session, switchRole, endExperience, routes }
        : null,
    [endExperience, routes, session, switchRole]
  );

  if (errorMessage) {
    return (
      <main style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p>{errorMessage}</p>
        <button type="button" onClick={() => router.replace(routes.home())}>
          메인으로 돌아가기
        </button>
      </main>
    );
  }
  if (!value) {
    return <main style={{ padding: '48px 24px', textAlign: 'center' }}>체험을 준비하고 있습니다.</main>;
  }

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error('useExperience must be used within an ExperienceProvider');
  }
  return context;
}
