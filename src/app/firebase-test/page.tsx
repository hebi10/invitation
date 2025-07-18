'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { addComment, getComments, Comment } from '@/services/commentService';
import styles from './firebase-test.module.css';

export default function FirebaseTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [testName, setTestName] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Firebase Test] ${message}`);
  };

  // 환경 변수 확인
  useEffect(() => {
    addLog('=== 환경 변수 확인 ===');
    addLog(`NEXT_PUBLIC_USE_FIREBASE: ${process.env.NEXT_PUBLIC_USE_FIREBASE}`);
    addLog(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`);
    addLog(`NEXT_PUBLIC_FIREBASE_API_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '설정됨' : '설정되지 않음'}`);
    addLog('환경 변수 확인 완료');
    
    // 초기 댓글 로드 테스트
    testGetComments();
  }, []);

  const testGetComments = async () => {
    addLog('=== 댓글 가져오기 테스트 시작 ===');
    setIsLoading(true);
    
    try {
      addLog('getComments 함수 호출 중...');
      const fetchedComments = await getComments('firebase-test');
      addLog(`댓글 ${fetchedComments.length}개 가져오기 성공`);
      setComments(fetchedComments);
      
      fetchedComments.forEach((comment, index) => {
        addLog(`댓글 ${index + 1}: ${comment.author} - ${comment.message}`);
      });
    } catch (error) {
      addLog(`댓글 가져오기 실패: ${error}`);
    } finally {
      setIsLoading(false);
      addLog('=== 댓글 가져오기 테스트 종료 ===');
    }
  };

  const testAddComment = async () => {
    if (!testName.trim() || !testMessage.trim()) {
      addLog('⚠️ 이름과 메시지를 입력해주세요');
      return;
    }

    addLog('=== 댓글 추가 테스트 시작 ===');
    setIsLoading(true);

    try {
      addLog('addComment 함수 호출 중...');
      await addComment({
        author: testName.trim(),
        message: testMessage.trim(),
        pageSlug: 'firebase-test'
      });
      addLog('댓글 추가 성공');
      
      // 폼 초기화
      setTestName('');
      setTestMessage('');
      
      // 댓글 목록 새로고침
      addLog('댓글 목록 새로고침 중...');
      await testGetComments();
    } catch (error) {
      addLog(`댓글 추가 실패: ${error}`);
    } finally {
      setIsLoading(false);
      addLog('=== 댓글 추가 테스트 종료 ===');
    }
  };

  const testFirebaseConnection = async () => {
    addLog('=== Firebase 연결 테스트 시작 ===');
    
    try {
      addLog('Firebase 모듈 import 테스트 중...');
      const firebaseModule = await import('@/lib/firebase');
      addLog('Firebase 모듈 import 성공');
      
      addLog(`Firebase app: ${firebaseModule.app ? '초기화됨' : '초기화되지 않음'}`);
      addLog(`Firebase db: ${firebaseModule.db ? '초기화됨' : '초기화되지 않음'}`);
      addLog(`Firebase storage: ${firebaseModule.storage ? '초기화됨' : '초기화되지 않음'}`);
      
      if (firebaseModule.db) {
        addLog('Firestore 연결 상태: 정상');
        
        // ensureFirebaseInit 테스트
        addLog('ensureFirebaseInit 테스트 중...');
        const { ensureFirebaseInit } = firebaseModule;
        if (ensureFirebaseInit) {
          await ensureFirebaseInit();
          addLog('ensureFirebaseInit 완료');
        } else {
          addLog('⚠️ ensureFirebaseInit 함수가 없습니다');
        }
        
        // Firestore 모듈 테스트
        addLog('Firestore 모듈 import 테스트 중...');
        const firestoreModule = await import('firebase/firestore');
        addLog('Firestore 모듈 import 성공');
        
        // 간단한 컬렉션 참조 테스트
        try {
          const testCollection = firestoreModule.collection(firebaseModule.db, 'test');
          addLog('컬렉션 참조 생성 성공');
        } catch (collectionError) {
          addLog(`컬렉션 참조 생성 실패: ${collectionError}`);
        }
        
      } else {
        addLog('❌ Firestore 연결 실패');
      }
    } catch (error) {
      addLog(`Firebase 연결 테스트 실패: ${error}`);
      console.error('Firebase 연결 테스트 상세 오류:', error);
    }
    
    addLog('=== Firebase 연결 테스트 종료 ===');
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <>
      <Head>
        <title>Firebase 연결 테스트 - 모바일 청첩장</title>
        <meta name="description" content="Firebase 연결 상태 및 댓글 시스템 테스트 페이지입니다." />
        <meta property="og:title" content="Firebase 테스트 페이지" />
        <meta property="og:description" content="Firebase 연결 및 댓글 시스템 테스트" />
        <meta property="og:image" content="https://images.unsplash.com/photo-1594736797933-d0c6258a3d68?w=800&h=600&fit=crop" />
        <meta name="robots" content="noindex, nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.title}>Firebase 연결 테스트</h1>
      
      <div className={styles.section}>
        <h2>연결 테스트</h2>
        <button onClick={testFirebaseConnection} disabled={isLoading}>
          Firebase 연결 테스트
        </button>
      </div>

      <div className={styles.section}>
        <h2>댓글 기능 테스트</h2>
        <div className={styles.form}>
          <input
            type="text"
            placeholder="이름"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            disabled={isLoading}
          />
          <textarea
            placeholder="메시지"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            disabled={isLoading}
          />
          <button onClick={testAddComment} disabled={isLoading}>
            댓글 추가 테스트
          </button>
          <button onClick={testGetComments} disabled={isLoading}>
            댓글 가져오기 테스트
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>현재 댓글 목록 ({comments.length}개)</h2>
        <div className={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <strong>{comment.author}</strong>: {comment.message}
              <span className={styles.date}>
                {comment.createdAt.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.logsHeader}>
          <h2>상세 로그</h2>
          <button onClick={clearLogs}>로그 지우기</button>
        </div>
        <div className={styles.logs}>
          {logs.map((log, index) => (
            <div key={index} className={styles.logEntry}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
