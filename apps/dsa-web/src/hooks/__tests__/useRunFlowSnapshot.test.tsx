import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analysisApi } from '../../api/analysis';
import { historyApi } from '../../api/history';
import type { RunFlowSnapshot } from '../../types/runFlow';
import type { UseTaskStreamOptions } from '../useTaskStream';
import { useRunFlowSnapshot } from '../useRunFlowSnapshot';

vi.mock('../../api/analysis', () => ({
  analysisApi: {
    getTaskFlow: vi.fn(),
  },
}));

vi.mock('../../api/history', () => ({
  historyApi: {
    getRecordFlow: vi.fn(),
  },
}));

const taskStreamCalls: UseTaskStreamOptions[] = [];

vi.mock('../useTaskStream', () => ({
  useTaskStream: (options: UseTaskStreamOptions) => {
    taskStreamCalls.push(options);
    return {
      isConnected: true,
      reconnect: vi.fn(),
      disconnect: vi.fn(),
    };
  },
}));

const snapshot: RunFlowSnapshot = {
  taskId: 'task-1',
  traceId: 'trace-1',
  stockCode: '600519',
  stockName: '贵州茅台',
  status: 'running',
  generatedAt: '2026-06-08T08:00:00Z',
  summary: {
    elapsedMs: null,
    failedAttempts: 0,
    fallbackCount: 0,
    model: null,
    dataSourceCount: 0,
    eventCount: 1,
  },
  lanes: [
    { id: 'entry', label: '入口', order: 1 },
    { id: 'data_source', label: '数据来源', order: 2 },
  ],
  nodes: [
    {
      id: 'task_queue',
      lane: 'entry',
      kind: 'queue',
      label: '任务队列',
      status: 'running',
    },
  ],
  edges: [],
  events: [
    {
      id: 'evt-1',
      timestamp: '2026-06-08T08:00:00Z',
      severity: 'info',
      type: 'task_started',
      nodeId: 'task_queue',
      title: '任务开始执行',
    },
  ],
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe('useRunFlowSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    taskStreamCalls.length = 0;
  });

  it('merges active task flow events, strips node metadata, and refetches after stream errors', async () => {
    vi.mocked(analysisApi.getTaskFlow).mockResolvedValue(snapshot);

    const { result } = renderHook(() => useRunFlowSnapshot({
      source: { type: 'task', taskId: 'task-1' },
      enabled: true,
    }));

    await waitFor(() => expect(result.current.snapshot).not.toBeNull());

    act(() => {
      taskStreamCalls.at(-1)?.onTaskFlowEvent?.(
        {
          taskId: 'task-1',
          stockCode: '600519',
          status: 'processing',
          progress: 30,
          reportType: 'detailed',
          createdAt: '2026-06-08T08:00:00Z',
        },
        {
          id: 'flow-1',
          timestamp: '2026-06-08T08:00:01Z',
          severity: 'success',
          type: 'provider_run',
          nodeId: 'provider_daily_1',
          title: '日线K线成功',
          metadata: {
            provider: 'DailyFetcher',
            node: {
              id: 'provider_daily_1',
              lane: 'data_source',
              kind: 'data_source',
              label: '日线K线',
              status: 'success',
            },
          },
        },
      );
    });

    expect(result.current.snapshot?.events).toHaveLength(2);
    expect(result.current.snapshot?.events[1].metadata).not.toHaveProperty('node');
    expect(result.current.snapshot?.nodes.some((node) => node.id === 'provider_daily_1')).toBe(true);

    act(() => {
      taskStreamCalls.at(-1)?.onError?.(new Event('error'));
    });

    await waitFor(() => expect(analysisApi.getTaskFlow).toHaveBeenCalledTimes(2));
  });

  it('does not enable task stream for history snapshots', async () => {
    vi.mocked(historyApi.getRecordFlow).mockResolvedValue({ ...snapshot, status: 'success' });

    renderHook(() => useRunFlowSnapshot({
      source: { type: 'history', recordId: 7 },
      enabled: true,
    }));

    await waitFor(() => expect(historyApi.getRecordFlow).toHaveBeenCalledWith(7));
    expect(taskStreamCalls.at(-1)?.enabled).toBe(false);
  });

  it('replays buffered flow events into refetched task snapshots', async () => {
    const initialRequest = createDeferred<RunFlowSnapshot>();
    const refreshedRequest = createDeferred<RunFlowSnapshot>();
    vi.mocked(analysisApi.getTaskFlow)
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(refreshedRequest.promise);

    const { result } = renderHook(() => useRunFlowSnapshot({
      source: { type: 'task', taskId: 'task-1' },
      enabled: true,
    }));

    act(() => {
      initialRequest.resolve(snapshot);
    });

    await waitFor(() => expect(result.current.snapshot?.events).toHaveLength(1));

    act(() => {
      taskStreamCalls.at(-1)?.onTaskCompleted?.({
        taskId: 'task-1',
        stockCode: '600519',
        status: 'completed',
        progress: 100,
        reportType: 'detailed',
        createdAt: '2026-06-08T08:00:00Z',
      });
      taskStreamCalls.at(-1)?.onTaskFlowEvent?.(
        {
          taskId: 'task-1',
          stockCode: '600519',
          status: 'processing',
          progress: 99,
          reportType: 'detailed',
          createdAt: '2026-06-08T08:00:00Z',
        },
        {
          id: 'flow-late',
          timestamp: '2026-06-08T08:00:02Z',
          severity: 'success',
          type: 'provider_run',
          nodeId: 'provider_news_1',
          title: '新闻检索成功',
          metadata: {
            provider: 'NewsFetcher',
            node: {
              id: 'provider_news_1',
              lane: 'data_source',
              kind: 'data_source',
              label: '新闻 · NewsFetcher',
              status: 'success',
            },
          },
        },
      );
    });

    await waitFor(() => expect(analysisApi.getTaskFlow).toHaveBeenCalledTimes(2));

    act(() => {
      refreshedRequest.resolve({
        ...snapshot,
        status: 'success',
        events: snapshot.events,
        nodes: snapshot.nodes,
      });
    });

    await waitFor(() => expect(result.current.snapshot?.status).toBe('success'));
    const lateEvent = result.current.snapshot?.events.find((event) => event.id === 'flow-late');
    expect(lateEvent).toBeDefined();
    expect(lateEvent?.metadata).not.toHaveProperty('node');
    expect(result.current.snapshot?.nodes.some((node) => node.id === 'provider_news_1')).toBe(true);
  });
});
