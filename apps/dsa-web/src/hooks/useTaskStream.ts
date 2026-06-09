import { useEffect, useRef, useCallback, useState } from 'react';
import { analysisApi } from '../api/analysis';
import { toCamelCase } from '../api/utils';
import type { TaskInfo } from '../types/analysis';
import type { RunFlowEvent } from '../types/runFlow';

/**
 * SSE event types.
 */
export type SSEEventType =
  | 'connected'
  | 'task_created'
  | 'task_started'
  | 'task_progress'
  | 'task_completed'
  | 'task_failed'
  | 'heartbeat';

/**
 * SSE event payload.
 */
export interface SSEEvent {
  type: SSEEventType;
  task?: TaskInfo;
  flowEvent?: RunFlowEvent;
  timestamp?: string;
}

/**
 * SSE hook options.
 */
export interface UseTaskStreamOptions {
  /** Task created callback */
  onTaskCreated?: (task: TaskInfo) => void;
  /** Task started callback */
  onTaskStarted?: (task: TaskInfo) => void;
  /** Task completed callback */
  onTaskCompleted?: (task: TaskInfo) => void;
  /** Task progress callback */
  onTaskProgress?: (task: TaskInfo) => void;
  /** Task failed callback */
  onTaskFailed?: (task: TaskInfo) => void;
  /** Incremental run-flow event callback carried by task_progress */
  onTaskFlowEvent?: (task: TaskInfo, event: RunFlowEvent) => void;
  /** Connected callback */
  onConnected?: () => void;
  /** Connection error callback */
  onError?: (error: Event) => void;
  /** Whether to reconnect automatically */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Whether the hook is enabled */
  enabled?: boolean;
}

/**
 * SSE hook result.
 */
export interface UseTaskStreamResult {
  /** Whether the stream is connected */
  isConnected: boolean;
  /** Reconnect manually */
  reconnect: () => void;
  /** Disconnect manually */
  disconnect: () => void;
}

/**
 * Task-stream SSE hook for realtime task status updates.
 */
export function useTaskStream(options: UseTaskStreamOptions = {}): UseTaskStreamResult {
  const {
    onTaskCreated,
    onTaskStarted,
    onTaskCompleted,
    onTaskProgress,
    onTaskFailed,
    onTaskFlowEvent,
    onConnected,
    onError,
    autoReconnect = true,
    reconnectDelay = 3000,
    enabled = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<() => void>(() => {});

  // Store callbacks in a ref to avoid reconnecting on every render.
  const callbacksRef = useRef({
    onTaskCreated,
    onTaskStarted,
    onTaskCompleted,
    onTaskProgress,
    onTaskFailed,
    onTaskFlowEvent,
    onConnected,
    onError,
  });

  // Keep the latest callbacks available to the active SSE handlers.
  useEffect(() => {
    callbacksRef.current = {
      onTaskCreated,
      onTaskStarted,
      onTaskCompleted,
      onTaskProgress,
      onTaskFailed,
      onTaskFlowEvent,
      onConnected,
      onError,
    };
  });

  // Convert snake_case payloads into camelCase TaskInfo objects.
  const toTaskInfo = (data: Record<string, unknown>): TaskInfo => {
    const task: TaskInfo = {
      taskId: data.task_id as string,
      stockCode: data.stock_code as string,
      stockName: data.stock_name as string | undefined,
      status: data.status as TaskInfo['status'],
      progress: data.progress as number,
      message: data.message as string | undefined,
      reportType: data.report_type as string,
      createdAt: data.created_at as string,
      startedAt: data.started_at as string | undefined,
      completedAt: data.completed_at as string | undefined,
      error: data.error as string | undefined,
      originalQuery: data.original_query as string | undefined,
      selectionSource: data.selection_source as string | undefined,
      analysisPhase: data.analysis_phase as TaskInfo['analysisPhase'],
      skills: Array.isArray(data.skills) ? data.skills.map(String) : undefined,
    };

    if (typeof data.trace_id === 'string' && data.trace_id.trim()) {
      task.traceId = data.trace_id;
    }

    return task;
  };

  // Parse an SSE payload.
  const parseEventData = useCallback((eventData: string): { task: TaskInfo; flowEvent?: RunFlowEvent } | null => {
    try {
      const data = JSON.parse(eventData);
      const task = toTaskInfo(data);
      const flowEvent = data.flow_event
        ? toCamelCase<RunFlowEvent>(data.flow_event)
        : undefined;
      return { task, flowEvent };
    } catch (e) {
      console.error('Failed to parse SSE event data:', e);
      return null;
    }
  }, []);

  // Create an EventSource connection.
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (typeof window.EventSource !== 'function') {
      setIsConnected(false);
      return;
    }

    const url = analysisApi.getTaskStreamUrl();
    const eventSource = new EventSource(url, { withCredentials: true });
    eventSourceRef.current = eventSource;

    // Connected event
    eventSource.addEventListener('connected', () => {
      setIsConnected(true);
      callbacksRef.current.onConnected?.();
    });

    // Task created event
    eventSource.addEventListener('task_created', (e) => {
      const payload = parseEventData(e.data);
      if (payload) callbacksRef.current.onTaskCreated?.(payload.task);
    });

    // Task started event
    eventSource.addEventListener('task_started', (e) => {
      const payload = parseEventData(e.data);
      if (payload) callbacksRef.current.onTaskStarted?.(payload.task);
    });

    eventSource.addEventListener('task_progress', (e) => {
      const payload = parseEventData(e.data);
      if (payload) {
        callbacksRef.current.onTaskProgress?.(payload.task);
        if (payload.flowEvent) {
          callbacksRef.current.onTaskFlowEvent?.(payload.task, payload.flowEvent);
        }
      }
    });

    // Task completed event
    eventSource.addEventListener('task_completed', (e) => {
      const payload = parseEventData(e.data);
      if (payload) callbacksRef.current.onTaskCompleted?.(payload.task);
    });

    // Task failed event
    eventSource.addEventListener('task_failed', (e) => {
      const payload = parseEventData(e.data);
      if (payload) callbacksRef.current.onTaskFailed?.(payload.task);
    });

    // Heartbeat event used to keep the connection alive.
    eventSource.addEventListener('heartbeat', () => {
      // Optional place to record the latest heartbeat timestamp.
    });

    // Connection error handling
    eventSource.onerror = (error) => {
      setIsConnected(false);
      callbacksRef.current.onError?.(error);

      // Auto-reconnect via ref to avoid stale closure issues.
      if (autoReconnect && enabled) {
        eventSource.close();
        reconnectTimeoutRef.current = setTimeout(() => {
          connectRef.current();
        }, reconnectDelay);
      }
    };
  }, [
    autoReconnect,
    reconnectDelay,
    enabled,
    parseEventData,
  ]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Disconnect and defer the state update to avoid nested renders.
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    queueMicrotask(() => setIsConnected(false));
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [disconnect, connect]);

  // Connect or disconnect when the hook is enabled or disabled.
  useEffect(() => {
    if (enabled) {
      const connectTimer = window.setTimeout(() => {
        connect();
      }, 0);
      return () => {
        window.clearTimeout(connectTimer);
        disconnect();
      };
    }

    disconnect();
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    reconnect,
    disconnect,
  };
}

export default useTaskStream;
