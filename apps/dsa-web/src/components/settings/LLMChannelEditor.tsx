import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';
import type { ParsedApiError } from '../../api/error';
import { getParsedApiError } from '../../api/error';
import { systemConfigApi } from '../../api/systemConfig';
import { ApiErrorAlert, EyeToggleIcon, Select, Button, Input, Badge } from '../common';

type ChannelProtocol = 'openai' | 'deepseek' | 'gemini' | 'anthropic' | 'vertex_ai' | 'ollama';

interface ChannelPreset {
  label: string;
  protocol: ChannelProtocol;
  baseUrl: string;
  placeholder: string;
}

const CHANNEL_PRESETS: Record<string, ChannelPreset> = {
  aihubmix: {
    label: 'AIHubmix（聚合平台）',
    protocol: 'openai',
    baseUrl: 'https://aihubmix.com/v1',
    placeholder: 'gpt-4o-mini,claude-3-5-sonnet,qwen-plus',
  },
  deepseek: {
    label: 'DeepSeek 官方',
    protocol: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    placeholder: 'deepseek-chat,deepseek-reasoner',
  },
  dashscope: {
    label: '通义千问（Dashscope）',
    protocol: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    placeholder: 'qwen-plus,qwen-turbo',
  },
  zhipu: {
    label: '智谱 GLM',
    protocol: 'openai',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    placeholder: 'glm-4-flash,glm-4-plus',
  },
  moonshot: {
    label: 'Moonshot（月之暗面）',
    protocol: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    placeholder: 'moonshot-v1-8k',
  },
  siliconflow: {
    label: '硅基流动（SiliconFlow）',
    protocol: 'openai',
    baseUrl: 'https://api.siliconflow.cn/v1',
    placeholder: 'Qwen/Qwen3-8B,deepseek-ai/DeepSeek-V3',
  },
  openrouter: {
    label: 'OpenRouter',
    protocol: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    placeholder: 'openai/gpt-4o,anthropic/claude-3-5-sonnet',
  },
  gemini: {
    label: 'Gemini 官方',
    protocol: 'gemini',
    baseUrl: '',
    placeholder: 'gemini-2.5-flash,gemini-2.5-pro',
  },
  anthropic: {
    label: 'Anthropic 官方',
    protocol: 'anthropic',
    baseUrl: '',
    placeholder: 'claude-3-5-sonnet-20241022',
  },
  openai: {
    label: 'OpenAI 官方',
    protocol: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    placeholder: 'gpt-4o,gpt-4o-mini',
  },
  ollama: {
    label: 'Ollama（本地）',
    protocol: 'ollama',
    baseUrl: 'http://127.0.0.1:11434',
    placeholder: 'llama3.2,qwen2.5',
  },
  custom: {
    label: '自定义渠道',
    protocol: 'openai',
    baseUrl: '',
    placeholder: 'model-name-1,model-name-2',
  },
};

const PROTOCOL_OPTIONS: Array<{ value: ChannelProtocol; label: string }> = [
  { value: 'openai', label: 'OpenAI Compatible' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'vertex_ai', label: 'Vertex AI' },
  { value: 'ollama', label: 'Ollama' },
];

const MODEL_PLACEHOLDERS: Record<ChannelProtocol, string> = {
  openai: 'gpt-4o-mini,deepseek-chat,qwen-plus',
  deepseek: 'deepseek-chat,deepseek-reasoner',
  gemini: 'gemini-2.5-flash,gemini-2.5-pro',
  anthropic: 'claude-3-5-sonnet-20241022',
  vertex_ai: 'gemini-2.5-flash',
  ollama: 'llama3.2,qwen2.5',
};

const KNOWN_MODEL_PREFIXES = new Set([
  'openai',
  'anthropic',
  'gemini',
  'vertex_ai',
  'deepseek',
  'ollama',
  'cohere',
  'huggingface',
  'bedrock',
  'sagemaker',
  'azure',
  'replicate',
  'together_ai',
  'palm',
  'text-completion-openai',
  'command-r',
  'groq',
  'cerebras',
  'fireworks_ai',
  'friendliai',
]);

const FALSEY_VALUES = new Set(['0', 'false', 'no', 'off']);

interface ChannelConfig {
  name: string;
  protocol: ChannelProtocol;
  baseUrl: string;
  apiKey: string;
  models: string;
  enabled: boolean;
}

interface ChannelTestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  text?: string;
}

interface RuntimeConfig {
  primaryModel: string;
  fallbackModels: string[];
  visionModel: string;
  temperature: string;
}

interface LLMChannelEditorProps {
  items: Array<{ key: string; value: string }>;
  configVersion: string;
  maskToken: string;
  onSaved: () => void;
  disabled?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Compact channel row with expandable detail                        */
/* ------------------------------------------------------------------ */

interface ChannelRowProps {
  channel: ChannelConfig;
  index: number;
  busy: boolean;
  visibleKey: boolean;
  expanded: boolean;
  testState?: ChannelTestState;
  onUpdate: (index: number, field: keyof ChannelConfig, value: string | boolean) => void;
  onRemove: (index: number) => void;
  onToggleExpand: (index: number) => void;
  onToggleKeyVisibility: (index: number) => void;
  onTest: (channel: ChannelConfig, index: number) => void;
}

const ChannelRow: React.FC<ChannelRowProps> = ({
  channel,
  index,
  busy,
  visibleKey,
  expanded,
  testState,
  onUpdate,
  onRemove,
  onToggleExpand,
  onToggleKeyVisibility,
  onTest,
}) => {
  const preset = CHANNEL_PRESETS[channel.name];
  const displayName = preset?.label || channel.name;
  const modelCount = splitModels(channel.models).length;
  const hasKey = channel.apiKey.length > 0;

  return (
    <div className="rounded-xl border border-white/8 bg-card/40 overflow-hidden shadow-soft-card mb-2">
      {/* Summary row — always visible */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none hover:bg-white/[0.04] transition-colors"
        onClick={() => onToggleExpand(index)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleExpand(index); } }}
        role="button"
        tabIndex={0}
      >
        <span className="text-[11px] text-muted-text w-4 shrink-0 transition-transform duration-200" style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>

        <input
          type="checkbox"
          checked={channel.enabled}
          disabled={busy}
          className="shrink-0 w-4 h-4 rounded border-white/10 bg-card text-cyan focus:ring-cyan/20 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
        />

        <span className="min-w-[120px] truncate text-sm text-white font-semibold">{displayName}</span>

        <Badge variant="info" size="sm" className="hidden sm:inline-flex opacity-80">
          {channel.protocol}
        </Badge>

        <span className="text-xs text-secondary-text truncate flex-1 ml-2">
          {modelCount > 0 ? `${modelCount} 个模型` : '未配置模型'}
        </span>

        {/* Status indicators */}
        <span className="flex items-center gap-1.5 shrink-0">
          {testState?.status === 'success' && <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" title="连接正常" />}
          {testState?.status === 'error' && <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.5)]" title="连接失败" />}
          {testState?.status === 'loading' && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.5)]" title="测试中" />}
          {!hasKey && channel.protocol !== 'ollama' && (
            <span className="text-[10px] text-amber-400/80 font-medium">未填 Key</span>
          )}
        </span>

        <button
          type="button"
          className="shrink-0 text-muted-text hover:text-danger transition-colors p-1"
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          title="删除渠道"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Detail panel — only when expanded */}
      {expanded && (
        <div className="border-t border-white/6 bg-white/[0.02] px-4 py-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="渠道名称"
              className="h-10"
              value={channel.name}
              disabled={busy}
              onChange={(e) => onUpdate(index, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="primary"
              hint="只能包含小写字母、数字和下划线"
            />
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-foreground">协议</label>
              <Select
                className="h-10"
                value={channel.protocol}
                onChange={(v) => onUpdate(index, 'protocol', normalizeProtocol(v))}
                options={PROTOCOL_OPTIONS}
                disabled={busy}
                placeholder="选择协议"
              />
            </div>
          </div>

          <Input
            label="Base URL"
            className="h-10"
            value={channel.baseUrl}
            disabled={busy}
            onChange={(e) => onUpdate(index, 'baseUrl', e.target.value)}
            placeholder={
              channel.protocol === 'gemini' || channel.protocol === 'anthropic'
                ? '官方接口可留空'
                : preset?.baseUrl || 'https://api.example.com/v1'
            }
          />

          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-foreground">API Key</label>
            <div className="flex items-center gap-2">
              <Input
                type={visibleKey ? 'text' : 'password'}
                className="h-10 flex-1"
                value={channel.apiKey}
                disabled={busy}
                onChange={(e) => onUpdate(index, 'apiKey', e.target.value)}
                placeholder={channel.protocol === 'ollama' ? '本地 Ollama 可留空' : '支持多个 Key 逗号分隔'}
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-10 w-10 p-0 shrink-0"
                disabled={busy}
                onClick={() => onToggleKeyVisibility(index)}
                title={visibleKey ? '隐藏' : '显示'}
              >
                <EyeToggleIcon visible={visibleKey} />
              </Button>
            </div>
          </div>

          <Input
            label="模型（逗号分隔）"
            className="h-10"
            value={channel.models}
            disabled={busy}
            onChange={(e) => onUpdate(index, 'models', e.target.value)}
            placeholder={preset?.placeholder || MODEL_PLACEHOLDERS[channel.protocol]}
          />

          <div className="flex items-center gap-3 pt-1">
            <Button
              variant="outline"
              size="sm"
              isLoading={testState?.status === 'loading'}
              loadingText="测试中..."
              onClick={() => onTest(channel, index)}
            >
              测试连接
            </Button>
            {testState?.text && (
              <span className={`text-xs font-medium ${
                testState.status === 'success' ? 'text-success'
                : testState.status === 'error' ? 'text-danger'
                : 'text-muted-text'
              }`}>
                {testState.text}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function normalizeProtocol(value: string): ChannelProtocol {
  const normalized = value.trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'vertex' || normalized === 'vertexai') {
    return 'vertex_ai';
  }
  if (normalized === 'claude') {
    return 'anthropic';
  }
  if (normalized === 'google') {
    return 'gemini';
  }
  if (normalized === 'deepseek') {
    return 'deepseek';
  }
  if (normalized === 'gemini') {
    return 'gemini';
  }
  if (normalized === 'anthropic') {
    return 'anthropic';
  }
  if (normalized === 'vertex_ai') {
    return 'vertex_ai';
  }
  if (normalized === 'ollama') {
    return 'ollama';
  }
  return 'openai';
}

function inferProtocol(protocol: string, baseUrl: string, models: string[]): ChannelProtocol {
  const explicit = normalizeProtocol(protocol);
  if (protocol.trim()) {
    return explicit;
  }

  const firstPrefixedModel = models.find((model) => model.includes('/'));
  if (firstPrefixedModel) {
    return normalizeProtocol(firstPrefixedModel.split('/', 1)[0]);
  }

  if (baseUrl.includes('127.0.0.1') || baseUrl.includes('localhost')) {
    return 'openai';
  }

  return baseUrl.trim() ? 'openai' : 'openai';
}

function parseEnabled(value: string | undefined): boolean {
  if (!value) {
    return true;
  }
  return !FALSEY_VALUES.has(value.trim().toLowerCase());
}

function splitModels(models: string): string[] {
  return models
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const PROTOCOL_ALIASES: Record<string, string> = {
  vertexai: 'vertex_ai',
  vertex: 'vertex_ai',
  claude: 'anthropic',
  google: 'gemini',
  openai_compatible: 'openai',
  openai_compat: 'openai',
};

function normalizeModelForRuntime(model: string, protocol: ChannelProtocol): string {
  const trimmedModel = model.trim();
  if (!trimmedModel) {
    return trimmedModel;
  }

  if (trimmedModel.includes('/')) {
    const rawPrefix = trimmedModel.split('/', 1)[0].trim();
    const lowerPrefix = rawPrefix.toLowerCase();
    const canonicalPrefix = PROTOCOL_ALIASES[lowerPrefix] || lowerPrefix;
    if (KNOWN_MODEL_PREFIXES.has(lowerPrefix) || KNOWN_MODEL_PREFIXES.has(canonicalPrefix)) {
      // Known provider — canonicalize the prefix if it's an alias
      if (canonicalPrefix !== lowerPrefix && KNOWN_MODEL_PREFIXES.has(canonicalPrefix)) {
        return `${canonicalPrefix}/${trimmedModel.split('/').slice(1).join('/')}`;
      }
      return trimmedModel;
    }
    return `${protocol}/${trimmedModel}`;
  }

  return `${protocol}/${trimmedModel}`;
}

function resolveModelPreview(models: string, protocol: ChannelProtocol): string[] {
  return splitModels(models).map((model) => normalizeModelForRuntime(model, protocol));
}

function buildModelOptions(models: string[], selectedModel: string, autoLabel: string): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [{ value: '', label: autoLabel }];
  if (selectedModel && !models.includes(selectedModel)) {
    options.push({ value: selectedModel, label: `${selectedModel}（当前配置）` });
  }
  for (const model of models) {
    options.push({ value: model, label: model });
  }
  return options;
}

const MANAGED_PROVIDERS = new Set(['gemini', 'vertex_ai', 'anthropic', 'openai', 'deepseek']);

function usesDirectEnvProvider(model: string): boolean {
  if (!model || !model.includes('/')) return false;
  const provider = model.split('/', 1)[0].trim().toLowerCase();
  return Boolean(provider) && !MANAGED_PROVIDERS.has(provider);
}

/** Mirror of backend resolve_unified_llm_temperature: prefers provider-specific env for the active model. */
function resolveTemperatureFromItems(itemMap: Map<string, string>): string {
  const unified = itemMap.get('LLM_TEMPERATURE');
  if (unified) return unified;

  const primaryModel = itemMap.get('LITELLM_MODEL') || '';
  const provider = primaryModel.includes('/') ? primaryModel.split('/')[0] : (primaryModel ? 'openai' : '');
  const PROVIDER_TEMPERATURE_ENV: Record<string, string> = {
    gemini: 'GEMINI_TEMPERATURE',
    vertex_ai: 'GEMINI_TEMPERATURE',
    anthropic: 'ANTHROPIC_TEMPERATURE',
    openai: 'OPENAI_TEMPERATURE',
    deepseek: 'OPENAI_TEMPERATURE',
  };
  const preferredEnv = PROVIDER_TEMPERATURE_ENV[provider];
  if (preferredEnv) {
    const val = itemMap.get(preferredEnv);
    if (val) return val;
  }

  for (const envName of ['GEMINI_TEMPERATURE', 'ANTHROPIC_TEMPERATURE', 'OPENAI_TEMPERATURE']) {
    const val = itemMap.get(envName);
    if (val) return val;
  }

  return '0.7';
}

function parseRuntimeConfigFromItems(items: Array<{ key: string; value: string }>): RuntimeConfig {
  const itemMap = new Map(items.map((item) => [item.key, item.value]));
  return {
    primaryModel: itemMap.get('LITELLM_MODEL') || '',
    fallbackModels: splitModels(itemMap.get('LITELLM_FALLBACK_MODELS') || ''),
    visionModel: itemMap.get('VISION_MODEL') || '',
    temperature: resolveTemperatureFromItems(itemMap),
  };
}

function parseChannelsFromItems(items: Array<{ key: string; value: string }>): ChannelConfig[] {
  const itemMap = new Map(items.map((item) => [item.key, item.value]));
  const channelNames = (itemMap.get('LLM_CHANNELS') || '')
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean);

  return channelNames.map((name) => {
    const upperName = name.toUpperCase();
    const baseUrl = itemMap.get(`LLM_${upperName}_BASE_URL`) || '';
    const rawModels = itemMap.get(`LLM_${upperName}_MODELS`) || '';
    const models = splitModels(rawModels);

    return {
      name: name.toLowerCase(),
      protocol: inferProtocol(itemMap.get(`LLM_${upperName}_PROTOCOL`) || '', baseUrl, models),
      baseUrl,
      apiKey: itemMap.get(`LLM_${upperName}_API_KEYS`) || itemMap.get(`LLM_${upperName}_API_KEY`) || '',
      models: rawModels,
      enabled: parseEnabled(itemMap.get(`LLM_${upperName}_ENABLED`)),
    };
  });
}

function channelsToUpdateItems(
  channels: ChannelConfig[],
  previousChannelNames: string[],
  runtimeConfig: RuntimeConfig,
  includeRuntimeConfig: boolean,
): Array<{ key: string; value: string }> {
  const updates: Array<{ key: string; value: string }> = [];
  const activeNames = channels.map((channel) => channel.name.toUpperCase());

  updates.push({ key: 'LLM_CHANNELS', value: channels.map((channel) => channel.name).join(',') });
  if (includeRuntimeConfig) {
    updates.push({ key: 'LITELLM_MODEL', value: runtimeConfig.primaryModel });
    updates.push({ key: 'LITELLM_FALLBACK_MODELS', value: runtimeConfig.fallbackModels.join(',') });
    updates.push({ key: 'VISION_MODEL', value: runtimeConfig.visionModel });
    updates.push({ key: 'LLM_TEMPERATURE', value: runtimeConfig.temperature });
  }

  for (const channel of channels) {
    const prefix = `LLM_${channel.name.toUpperCase()}`;
    const isMultiKey = channel.apiKey.includes(',');
    updates.push({ key: `${prefix}_PROTOCOL`, value: channel.protocol });
    updates.push({ key: `${prefix}_BASE_URL`, value: channel.baseUrl });
    updates.push({ key: `${prefix}_ENABLED`, value: channel.enabled ? 'true' : 'false' });
    updates.push({ key: `${prefix}_API_KEY${isMultiKey ? 'S' : ''}`, value: channel.apiKey });
    updates.push({ key: `${prefix}_API_KEY${isMultiKey ? '' : 'S'}`, value: '' });
    updates.push({ key: `${prefix}_MODELS`, value: channel.models });
  }

  for (const oldName of previousChannelNames) {
    const upperName = oldName.toUpperCase();
    if (activeNames.includes(upperName)) {
      continue;
    }

    const prefix = `LLM_${upperName}`;
    updates.push({ key: `${prefix}_PROTOCOL`, value: '' });
    updates.push({ key: `${prefix}_BASE_URL`, value: '' });
    updates.push({ key: `${prefix}_ENABLED`, value: '' });
    updates.push({ key: `${prefix}_API_KEY`, value: '' });
    updates.push({ key: `${prefix}_API_KEYS`, value: '' });
    updates.push({ key: `${prefix}_MODELS`, value: '' });
    updates.push({ key: `${prefix}_EXTRA_HEADERS`, value: '' });
  }

  return updates;
}

function channelsAreEqual(left: ChannelConfig, right: ChannelConfig): boolean {
  return (
    left.name === right.name
    && left.protocol === right.protocol
    && left.baseUrl === right.baseUrl
    && left.apiKey === right.apiKey
    && left.models === right.models
    && left.enabled === right.enabled
  );
}

export const LLMChannelEditor: React.FC<LLMChannelEditorProps> = ({
  items,
  configVersion,
  maskToken,
  onSaved,
  disabled = false,
}) => {
  const initialChannels = useMemo(() => parseChannelsFromItems(items), [items]);
  const initialNames = useMemo(() => initialChannels.map((channel) => channel.name), [initialChannels]);
  const initialRuntimeConfig = useMemo(() => parseRuntimeConfigFromItems(items), [items]);
  const hasLitellmConfig = useMemo(
    () => items.some((item) => item.key === 'LITELLM_CONFIG' && item.value.trim().length > 0),
    [items],
  );
  const managesRuntimeConfig = !hasLitellmConfig;

  // Stable fingerprints to avoid resetting editor state when unrelated fields
  // (e.g. LITELLM_CONFIG) in the same category are edited by the user.
  const channelsFingerprint = useMemo(() => JSON.stringify(initialChannels), [initialChannels]);
  const runtimeFingerprint = useMemo(() => JSON.stringify(initialRuntimeConfig), [initialRuntimeConfig]);

  const [channels, setChannels] = useState<ChannelConfig[]>(initialChannels);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(initialRuntimeConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<
    | { type: 'success'; text: string }
    | { type: 'error'; error: ParsedApiError }
    | { type: 'local-error'; text: string }
    | null
  >(null);
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [testStates, setTestStates] = useState<Record<number, ChannelTestState>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [addPreset, setAddPreset] = useState('aihubmix');

  const prevChannelsRef = useRef(channelsFingerprint);
  const prevRuntimeRef = useRef(runtimeFingerprint);

  useEffect(() => {
    if (prevChannelsRef.current === channelsFingerprint && prevRuntimeRef.current === runtimeFingerprint) {
      return;
    }
    prevChannelsRef.current = channelsFingerprint;
    prevRuntimeRef.current = runtimeFingerprint;
    setChannels(initialChannels);
    setRuntimeConfig(initialRuntimeConfig);
    setVisibleKeys({});
    setTestStates({});
    setExpandedRows({});
    setSaveMessage(null);
    setIsCollapsed(false);
  }, [channelsFingerprint, runtimeFingerprint, initialChannels, initialRuntimeConfig]);

  const availableModels = useMemo(() => {
    if (!managesRuntimeConfig) {
      return [];
    }
    const seen = new Set<string>();
    const models: string[] = [];
    for (const channel of channels) {
      if (!channel.enabled || !channel.name.trim()) {
        continue;
      }
      for (const model of resolveModelPreview(channel.models, channel.protocol)) {
        if (!model || seen.has(model)) {
          continue;
        }
        seen.add(model);
        models.push(model);
      }
    }
    return models;
  }, [channels, managesRuntimeConfig]);

  const hasChanges = useMemo(() => {
    const runtimeChanged = (
      runtimeConfig.primaryModel !== initialRuntimeConfig.primaryModel
      || runtimeConfig.visionModel !== initialRuntimeConfig.visionModel
      || runtimeConfig.temperature !== initialRuntimeConfig.temperature
      || runtimeConfig.fallbackModels.join(',') !== initialRuntimeConfig.fallbackModels.join(',')
    );

    if (runtimeChanged || channels.length !== initialChannels.length) {
      return true;
    }
    return channels.some((channel, index) => !channelsAreEqual(channel, initialChannels[index]));
  }, [channels, initialChannels, initialRuntimeConfig, runtimeConfig]);

  const busy = disabled || isSaving;

  const updateChannel = (index: number, field: keyof ChannelConfig, value: string | boolean) => {
    setChannels((previous) => previous.map((channel, rowIndex) => {
      if (rowIndex !== index) return channel;
      const updated = { ...channel, [field]: value };

      // Auto-apply preset when name exactly matches a known provider
      if (field === 'name' && typeof value === 'string') {
        const newPreset = CHANNEL_PRESETS[value];
        if (newPreset) {
          const oldPreset = CHANNEL_PRESETS[channel.name];
          // Only auto-fill if value is empty or still from a previous preset
          if (!updated.baseUrl || updated.baseUrl === (oldPreset?.baseUrl ?? '')) {
            updated.baseUrl = newPreset.baseUrl;
          }
          updated.protocol = newPreset.protocol;
          if (!updated.models || updated.models === (oldPreset?.placeholder ?? '')) {
            updated.models = newPreset.placeholder;
          }
        }
      }

      return updated;
    }));
    setTestStates((previous) => {
      if (!(index in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[index];
      return next;
    });
  };

  const removeChannel = (index: number) => {
    setChannels((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
    setVisibleKeys({});
    setTestStates({});
    setExpandedRows({});
  };

  const addChannel = () => {
    const preset = CHANNEL_PRESETS[addPreset] || CHANNEL_PRESETS.custom;
    setChannels((previous) => {
      const existingNames = new Set(previous.map((channel) => channel.name));
      const baseName = addPreset === 'custom' ? 'custom' : addPreset;
      let nextName = baseName;
      let counter = 2;
      while (existingNames.has(nextName)) {
        nextName = `${baseName}${counter}`;
        counter += 1;
      }

      return [
        ...previous,
        {
          name: nextName,
          protocol: preset.protocol,
          baseUrl: preset.baseUrl,
          apiKey: '',
          models: preset.placeholder || '',
          enabled: true,
        },
      ];
    });
    setTestStates({});
    setExpandedRows((prev) => ({ ...prev, [channels.length]: true }));
    setIsCollapsed(false);
  };

  const handleSave = async () => {
    const hasEmptyName = channels.some((channel) => !channel.name.trim());
    if (hasEmptyName) {
      setSaveMessage({ type: 'local-error', text: '渠道名称不能为空，且只能包含字母、数字或下划线。' });
      return;
    }

    // Only validate model references against channel-derived models when
    // channels actually define models.  Users relying on LITELLM_CONFIG
    // or legacy API Key env vars may have models not visible here.
    if (managesRuntimeConfig && availableModels.length > 0) {
      const invalidPrimaryModel = runtimeConfig.primaryModel
        && !availableModels.includes(runtimeConfig.primaryModel)
        && !usesDirectEnvProvider(runtimeConfig.primaryModel);
      if (invalidPrimaryModel) {
        setSaveMessage({ type: 'local-error', text: '当前主模型不在已启用渠道的模型列表中，请重新选择。' });
        return;
      }

      const invalidFallbackModel = runtimeConfig.fallbackModels.some(
        (model) => !availableModels.includes(model) && !usesDirectEnvProvider(model),
      );
      if (invalidFallbackModel) {
        setSaveMessage({ type: 'local-error', text: '存在无效的 fallback 模型，请重新选择。' });
        return;
      }

      const invalidVisionModel = runtimeConfig.visionModel
        && !availableModels.includes(runtimeConfig.visionModel)
        && !usesDirectEnvProvider(runtimeConfig.visionModel);
      if (invalidVisionModel) {
        setSaveMessage({ type: 'local-error', text: '当前 Vision 模型不在已启用渠道的模型列表中，请重新选择。' });
        return;
      }
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updateItems = channelsToUpdateItems(channels, initialNames, runtimeConfig, managesRuntimeConfig);
      await systemConfigApi.update({
        configVersion,
        maskToken,
        reloadNow: true,
        items: updateItems,
      });
      setSaveMessage({ type: 'success', text: managesRuntimeConfig ? 'AI 配置已保存' : '渠道配置已保存' });
      onSaved();
    } catch (error: unknown) {
      setSaveMessage({ type: 'error', error: getParsedApiError(error) });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async (channel: ChannelConfig, index: number) => {
    setTestStates((previous) => ({
      ...previous,
      [index]: { status: 'loading', text: '测试中...' },
    }));

    try {
      const result = await systemConfigApi.testLLMChannel({
        name: channel.name,
        protocol: channel.protocol,
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        models: splitModels(channel.models),
        enabled: channel.enabled,
      });

      const text = result.success
        ? `连接成功${result.resolvedModel ? ` · ${result.resolvedModel}` : ''}${result.latencyMs ? ` · ${result.latencyMs} ms` : ''}`
        : (result.error || result.message || '测试失败');

      setTestStates((previous) => ({
        ...previous,
        [index]: {
          status: result.success ? 'success' : 'error',
          text,
        },
      }));
    } catch (error: unknown) {
      const parsed = getParsedApiError(error);
      setTestStates((previous) => ({
        ...previous,
        [index]: { status: 'error', text: parsed.message || '测试失败' },
      }));
    }
  };

  const toggleKeyVisibility = (index: number) => {
    setVisibleKeys((previous) => ({ ...previous, [index]: !previous[index] }));
  };

  const toggleExpand = (index: number) => {
    setExpandedRows((previous) => ({ ...previous, [index]: !previous[index] }));
  };

  const setPrimaryModel = (value: string) => {
    setRuntimeConfig((previous) => ({
      ...previous,
      primaryModel: value,
      fallbackModels: previous.fallbackModels.filter((model) => model !== value),
    }));
  };

  const toggleFallbackModel = (model: string) => {
    setRuntimeConfig((previous) => {
      const alreadySelected = previous.fallbackModels.includes(model);
      return {
        ...previous,
        fallbackModels: alreadySelected
          ? previous.fallbackModels.filter((item) => item !== model)
          : [...previous.fallbackModels, model],
      };
    });
  };

  return (
    <div className="rounded-2xl border border-cyan/20 bg-elevated/40 backdrop-blur-md p-5 shadow-glow-cyan/5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left group"
        onClick={() => setIsCollapsed((previous) => !previous)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">AI 模型渠道配置</h3>
            <Badge variant="info" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Beta</Badge>
          </div>
          <p className="mt-1 text-sm text-secondary-text leading-relaxed max-w-2xl">
            配置 LLM 渠道条目。启用后，您可以在下方「运行时参数」中指定主模型和 Fallback 策略。
          </p>
        </div>
        <span className="text-xs font-mono text-cyan/60 group-hover:text-cyan transition-colors ml-4 bg-white/5 px-2 py-1 rounded">
          {isCollapsed ? '[+] 展开' : '[-] 收起'}
        </span>
      </button>

      {!isCollapsed && (
        <div className="mt-6 space-y-6 animate-in fade-in duration-300">
          {/* --- Add Channel --- */}
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-2 block text-xs font-semibold text-muted-text uppercase tracking-wider">选择服务商快速添加</label>
              <Select
                value={addPreset}
                onChange={setAddPreset}
                options={Object.entries(CHANNEL_PRESETS).map(([value, preset]) => ({
                  value,
                  label: preset.label,
                }))}
                disabled={busy}
                placeholder="选择服务商"
                className="h-11"
              />
            </div>
            <Button
              variant="gradient"
              className="h-11 px-6 shadow-glow-cyan/20"
              disabled={busy}
              onClick={addChannel}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              添加渠道
            </Button>
          </div>

          {/* --- Channel List --- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-text uppercase tracking-widest flex items-center gap-2">
                已配置渠道
                {channels.length > 0 && (
                  <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-cyan/70">
                    {channels.filter(c => c.enabled).length}/{channels.length} ENABLED
                  </span>
                )}
              </span>
            </div>

          {channels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-4 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-muted-text/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm text-muted-text">暂无配置，请从上方选择预设添加</p>
            </div>
          ) : (
            <div className="grid gap-1">
              {channels.map((channel, index) => (
                <ChannelRow
                  key={index}
                  channel={channel}
                  index={index}
                  busy={busy}
                  visibleKey={Boolean(visibleKeys[index])}
                  expanded={Boolean(expandedRows[index])}
                  testState={testStates[index]}
                  onUpdate={updateChannel}
                  onRemove={removeChannel}
                  onToggleExpand={toggleExpand}
                  onToggleKeyVisibility={toggleKeyVisibility}
                  onTest={(ch, idx) => void handleTest(ch, idx)}
                />
              ))}
            </div>
          )}
          </div>

          {managesRuntimeConfig ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5 shadow-inner">
              <div className="mb-5 border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-muted-text uppercase tracking-widest">运行时参数 (Runtime Strategy)</span>
                <p className="mt-1 text-[11px] text-secondary-text">这些设置决定了系统在分析时如何选择具体的模型实例</p>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">Temperature (创造力)</label>
                  <Badge variant="default" className="font-mono text-cyan">{runtimeConfig.temperature}</Badge>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={runtimeConfig.temperature}
                    disabled={busy}
                    onChange={(event) => setRuntimeConfig((previous) => ({ ...previous, temperature: event.target.value }))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan focus:outline-none"
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-text leading-relaxed">
                  0 为极度严谨，2 为最大随机性。股票分析建议设定在 <span className="text-cyan/80">0.3 - 0.7</span> 之间。
                </p>
              </div>

              {availableModels.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-4 text-center text-xs text-muted-text">
                  请先添加并启用至少一个包含可用模型的渠道
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col">
                      <label className="mb-2 text-xs font-semibold text-muted-text uppercase tracking-wider">主模型 (Primary)</label>
                      <Select
                        className="h-10"
                        value={runtimeConfig.primaryModel}
                        onChange={setPrimaryModel}
                        options={buildModelOptions(availableModels, runtimeConfig.primaryModel, '自动（使用第一个可用模型）')}
                        disabled={busy}
                        placeholder=""
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-2 text-xs font-semibold text-muted-text uppercase tracking-wider">Vision 模型 (多模态)</label>
                      <Select
                        className="h-10"
                        value={runtimeConfig.visionModel}
                        onChange={(value) => setRuntimeConfig((previous) => ({ ...previous, visionModel: value }))}
                        options={buildModelOptions(availableModels, runtimeConfig.visionModel, '自动（跟随 Vision 默认逻辑）')}
                        disabled={busy}
                        placeholder=""
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block text-xs font-semibold text-muted-text uppercase tracking-wider">备选队列 (Fallback Queue)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 rounded-xl border border-white/5 bg-black/20 p-4">
                      {availableModels.map((model) => (
                        <label key={model} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                          runtimeConfig.fallbackModels.includes(model)
                            ? 'bg-cyan/5 border-cyan/30 text-white'
                            : 'bg-transparent border-white/5 text-secondary-text hover:border-white/10'
                        }`}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/10 bg-card text-cyan focus:ring-cyan/20"
                            checked={runtimeConfig.fallbackModels.includes(model)}
                            disabled={busy || model === runtimeConfig.primaryModel}
                            onChange={() => toggleFallbackModel(model)}
                          />
                          <span className="text-xs truncate font-medium">{model}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-text">
                      当主模型响应失败时，将按选择顺序尝试上述备选模型。
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 flex items-start gap-3">
              <svg className="w-5 h-5 text-warning shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-warning/90 leading-relaxed">
                <p className="font-bold mb-1 uppercase tracking-tight">Detecting LITELLM_CONFIG</p>
                当前正在使用 YAML 文件管理模型映射。此处的「渠道」仅用于 API 密钥同步，模型优先级请在 YAML 中配置。
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                glow
                className="px-8"
                disabled={busy || !hasChanges}
                onClick={() => void handleSave()}
                isLoading={isSaving}
                loadingText="正在保存..."
              >
                {managesRuntimeConfig ? '应用 AI 策略' : '保存渠道条目'}
              </Button>
              {!hasChanges && (
                <span className="text-xs text-muted-text italic">无待保存更改</span>
              )}
            </div>
          </div>

          {saveMessage?.type === 'success' && (
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {saveMessage.text}
              </div>
            </div>
          )}

          {saveMessage?.type === 'local-error' && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger animate-in shake-1">
              {saveMessage.text}
            </div>
          ) : null}

          {saveMessage?.type === 'error' ? (
            <ApiErrorAlert error={saveMessage.error} />
          ) : null}
        </div>
      )}
    </div>
  );
};
