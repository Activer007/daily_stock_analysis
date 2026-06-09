import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskStream } from '../useTaskStream';

const { getTaskStreamUrl } = vi.hoisted(() => ({
  getTaskStreamUrl: vi.fn(() => 'http://localhost/api/v1/analysis/tasks/stream'),
}));

vi.mock('../../api/analysis', () => ({
  analysisApi: {
    getTaskStreamUrl,
  },
}));

type MockEventSourceInstance = {
  listeners: Record<string, ((event: MessageEvent<string>) => void) | undefined>;
  addEventListener: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onerror: ((event: Event) => void) | null;
};

describe('useTaskStream', () => {
  let eventSourceInstance: MockEventSourceInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    eventSourceInstance = {
      listeners: {},
      addEventListener: vi.fn((type: string, listener: (event: MessageEvent<string>) => void) => {
        eventSourceInstance.listeners[type] = listener;
      }),
      close: vi.fn(),
      onerror: null,
    };

    class MockEventSource {
      addEventListener = eventSourceInstance.addEventListener;
      close = eventSourceInstance.close;
      onerror = eventSourceInstance.onerror;

      constructor(...args: unknown[]) {
        void args;
      }
    }

    Object.defineProperty(window, 'EventSource', {
      writable: true,
      configurable: true,
      value: MockEventSource,
    });
  });

  it('closes the SSE connection when the hook unmounts', async () => {
    const { unmount } = renderHook(() => useTaskStream({ enabled: true }));

    await waitFor(() => expect(getTaskStreamUrl).toHaveBeenCalledTimes(1));

    unmount();

    expect(eventSourceInstance.close).toHaveBeenCalled();
  });

  it('parses task_progress events and forwards the updated task payload', async () => {
    const onTaskProgress = vi.fn();
    const onTaskFlowEvent = vi.fn();

    renderHook(() => useTaskStream({ enabled: true, onTaskProgress, onTaskFlowEvent }));
    await waitFor(() => expect(eventSourceInstance.listeners.task_progress).toBeDefined());

    eventSourceInstance.listeners.task_progress?.(
      new MessageEvent('task_progress', {
        data: JSON.stringify({
          task_id: 'task-1',
          trace_id: 'trace-task-1',
          stock_code: '600519',
          stock_name: '贵州茅台',
          status: 'processing',
          progress: 72,
          message: 'LLM 正在生成分析结果',
          report_type: 'detailed',
          analysis_phase: 'intraday',
          created_at: '2026-03-29T08:00:00Z',
          skills: ['growth_quality'],
          flow_event: {
            id: 'flow-1',
            timestamp: '2026-03-29T08:00:01Z',
            severity: 'success',
            type: 'provider_run',
            node_id: 'provider_daily_1',
            title: '日线K线成功',
            metadata: {
              node: {
                id: 'provider_daily_1',
                lane: 'data_source',
                kind: 'data_source',
                label: '日线K线',
                status: 'success',
              },
            },
          },
        }),
      }),
    );

    expect(onTaskProgress).toHaveBeenCalledWith({
      taskId: 'task-1',
      traceId: 'trace-task-1',
      stockCode: '600519',
      stockName: '贵州茅台',
      status: 'processing',
      progress: 72,
      message: 'LLM 正在生成分析结果',
      reportType: 'detailed',
      createdAt: '2026-03-29T08:00:00Z',
      startedAt: undefined,
      completedAt: undefined,
      error: undefined,
      originalQuery: undefined,
      selectionSource: undefined,
      analysisPhase: 'intraday',
      skills: ['growth_quality'],
    });
    expect(onTaskFlowEvent).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: 'task-1' }),
      expect.objectContaining({
        id: 'flow-1',
        nodeId: 'provider_daily_1',
        metadata: expect.objectContaining({
          node: expect.objectContaining({ lane: 'data_source' }),
        }),
      }),
    );
  });
});
