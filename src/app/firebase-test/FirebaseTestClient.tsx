'use client';

import { useEffect, useState } from 'react';
import { addComment, getComments, type Comment } from '@/services';
import styles from './firebase-test.module.css';

export default function FirebaseTestClient() {
  const [logs, setLogs] = useState<string[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [testName, setTestName] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const fetchedComments = await getComments('firebase-test');
      setComments(fetchedComments);
      addLog(`Loaded ${fetchedComments.length} comments`);
    } catch (error) {
      console.error(error);
      addLog(`Failed to load comments: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    addLog('Firebase dev tools page loaded');
    addLog(`NEXT_PUBLIC_USE_FIREBASE=${process.env.NEXT_PUBLIC_USE_FIREBASE}`);
    void loadComments();
  }, []);

  const handleAddComment = async () => {
    if (!testName.trim() || !testMessage.trim()) {
      addLog('Name and message are required');
      return;
    }

    setIsLoading(true);
    try {
      await addComment({
        author: testName.trim(),
        message: testMessage.trim(),
        pageSlug: 'firebase-test',
      });
      addLog('Comment created');
      setTestName('');
      setTestMessage('');
      await loadComments();
    } catch (error) {
      console.error(error);
      addLog(`Failed to create comment: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Firebase Test</h1>

      <div className={styles.section}>
        <h2>Comment Test</h2>
        <div className={styles.form}>
          <input type="text" placeholder="Name" value={testName} onChange={(event) => setTestName(event.target.value)} disabled={isLoading} />
          <textarea placeholder="Message" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} disabled={isLoading} />
          <button onClick={() => void handleAddComment()} disabled={isLoading}>
            Add Comment
          </button>
          <button onClick={() => void loadComments()} disabled={isLoading}>
            Refresh Comments
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2>Current Comments ({comments.length})</h2>
        <div className={styles.commentsList}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.comment}>
              <strong>{comment.author}</strong>: {comment.message}
              <span className={styles.date}>{comment.createdAt.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.logsHeader}>
          <h2>Logs</h2>
          <button onClick={() => setLogs([])}>Clear</button>
        </div>
        <div className={styles.logs}>
          {logs.map((log) => (
            <div key={log} className={styles.logEntry}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
