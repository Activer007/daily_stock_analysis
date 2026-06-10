import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analysisApi } from '../api/analysis';
import { getParsedApiError, type ParsedApiError } from '../api/error';
import { historyApi } from '../api/history';
import type { RunFlowEvent, RunFlowNode, RunFlowSnapshot, RunFlowSnapshotSource } from '../types/runFlow';
import { useTaskStream } from './useTaskStream';

interface UseRunFlowSnapshotOptions {
  source?: RunFlowSnapshotSource | null;
  enabled?: boolean;
}

interface UseRunFlowSnapshotResult {
  snapshot: RunFlowSnapshot | null;
  isLoading: boolean;
  error: ParsedApiError | null;
  refetch: () => Promise<void>;
}

type RunFlowRequestState = {
  requestKey: string;
  snapshot: RunFlowSnapshot | null;
  error: ParsedApiError | null;
};

const MAX_BUFFERED_FLOW_EVENTS = 50;

const getSourceKey = (source?: RunFlowSnapshotSource | null): string => {
  if (!source) {
    return 'none';
  }
  return source.type === 'task'
    ? `task:${source.taskId}`
    : `history:${source.recordId}`;
};

const isUsableSource = (source?: RunFlowSnapshotSource | null): source is RunFlowSnapshotSource => {
  if (!source) {
    return false;
  }
  if (source.type === 'task') {
    return Boolean(source.taskId.trim());
  }
  return Number.isFinite(source.recordId);
};

const eventTime = (event: RunFlowEvent): number => (
  event.timestamp ? Date.parse(event.timestamp) || 0 : 0
);

const mergeEvents = (events: RunFlowEvent[], incoming: RunFlowEvent): RunFlowEvent[] => {
  const byId = new Map<string, RunFlowEvent>();
  [...events, incoming].forEach((event, index) => {
    byId.set(event.id || `event-${index}`, event);
  });
  return Array.from(byId.values()).sort((left, right) => eventTime(left) - eventTime(right));
};

const isRunFlowNode = (value: unknown): value is RunFlowNode => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const node = value as Partial<RunFlowNode>;
  return Boolean(node.id && node.lane && node.kind && node.label && node.status);
};

const mergeFlowEventIntoSnapshot = (
  snapshot: RunFlowSnapshot,
  flowEvent: RunFlowEvent,
): RunFlowSnapshot => {
  const nodeCandidate = flowEvent.metadata?.node;
  const eventMetadata = { ...(flowEvent.metadata || {}) };
  delete eventMetadata.node;
  const displayEvent: RunFlowEvent = {
    ...flowEvent,
    metadata: eventMetadata,
  };
  const events = mergeEvents(snapshot.events, displayEvent);
  const shouldMergeNode = isRunFlowNode(nodeCandidate)
    && !snapshot.nodes.some((node) => node.id === nodeCandidate.id);
  const nodes = shouldMergeNode
    ? [...snapshot.nodes, nodeCandidate]
    : snapshot.nodes;

  return {
    ...snapshot,
    nodes,
    events,
    summary: {
      ...snapshot.summary,
      eventCount: events.length,
    },
    generatedAt: flowEvent.timestamp || snapshot.generatedAt,
  };
};

const rememberFlowEvent = (events: RunFlowEvent[], flowEvent: RunFlowEvent): RunFlowEvent[] => {
  const byId = new Map<string, RunFlowEvent>();
  [...events, flowEvent].forEach((event, index) => {
    byId.set(event.id || `${event.type}:${event.nodeId || 'none'}:${event.timestamp || index}`, event);
  });
  return Array.from(byId.values())
    .sort((left, right) => eventTime(left) - eventTime(right))
    .slice(-MAX_BUFFERED_FLOW_EVENTS);
};

const replayFlowEvents = (
  snapshot: RunFlowSnapshot,
  flowEvents: RunFlowEvent[],
): RunFlowSnapshot => flowEvents.reduce(
  (currentSnapshot, flowEvent) => mergeFlowEventIntoSnapshot(currentSnapshot, flowEvent),
  snapshot,
);

export function useRunFlowSnapshot({
  source,
  enabled = true,
}: UseRunFlowSnapshotOptions): UseRunFlowSnapshotResult {
  const [requestState, setRequestState] = useState<RunFlowRequestState>({
    requestKey: 'none',
    snapshot: null,
    error: null,
  });
  const [reloadToken, setReloadToken] = useState(0);
  const sourceKey = useMemo(() => getSourceKey(source), [source]);
  const sourceType = source?.type;
  const taskId = source?.type === 'task' ? source.taskId : '';
  const recordId = source?.type === 'history' ? source.recordId : null;
  const requestKey = `${sourceKey}:${reloadToken}`;
  const shouldLoad = enabled && isUsableSource(source);
  const flowEventBufferRef = useRef<RunFlowEvent[]>([]);

  const refetch = useCallback(async () => {
    setReloadToken((value) => value + 1);
  }, []);

  useEffect(() => {
    flowEventBufferRef.current = [];
  }, [sourceKey]);

  useTaskStream({
    enabled: shouldLoad && sourceType === 'task',
    onTaskFlowEvent: (task, flowEvent) => {
      if (task.taskId !== taskId) {
        return;
      }
      flowEventBufferRef.current = rememberFlowEvent(flowEventBufferRef.current, flowEvent);
      setRequestState((current) => {
        const hasFreshState = current.requestKey === requestKey && current.snapshot;
        if (!hasFreshState) {
          return current;
        }
        return {
          ...current,
          snapshot: mergeFlowEventIntoSnapshot(current.snapshot as RunFlowSnapshot, flowEvent),
        };
      });
    },
    onTaskCompleted: (task) => {
      if (task.taskId === taskId) {
        void refetch();
      }
    },
    onTaskFailed: (task) => {
      if (task.taskId === taskId) {
        void refetch();
      }
    },
    onError: () => {
      if (sourceType === 'task') {
        void refetch();
      }
    },
  });

  useEffect(() => {
    if (!shouldLoad || !sourceType) {
      return undefined;
    }

    let active = true;

    const request = sourceType === 'task'
      ? analysisApi.getTaskFlow(taskId)
      : historyApi.getRecordFlow(recordId ?? 0);

    request
      .then((result) => {
        if (active) {
          const snapshot = sourceType === 'task'
            ? replayFlowEvents(result, flowEventBufferRef.current)
            : result;
          setRequestState({
            requestKey,
            snapshot,
            error: null,
          });
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setRequestState({
            requestKey,
            snapshot: null,
            error: getParsedApiError(err),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [recordId, requestKey, shouldLoad, sourceType, taskId]);

  const hasFreshState = shouldLoad && requestState.requestKey === requestKey;

  return {
    snapshot: hasFreshState ? requestState.snapshot : null,
    isLoading: shouldLoad && !hasFreshState,
    error: hasFreshState ? requestState.error : null,
    refetch,
  };
}
