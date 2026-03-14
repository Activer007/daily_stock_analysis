import type React from 'react';
import { useState, useMemo, useEffect } from 'react';
import type { ParsedApiError } from '../../api/error';
import { getParsedApiError } from '../../api/error';
import { systemConfigApi } from '../../api/systemConfig';
import { ApiErrorAlert, EyeToggleIcon, Select, Button, Input, Badge } from '../common';

type ChannelProtocol = 'openai' | 'deepseek' | 'gemini' | 'anthropic' | 'vertex_ai' | 'ollama';

interface LLMChannel {
  name: string;
  protocol: ChannelProtocol;
  baseUrl: string;
  apiKey: string;
  models: string; // Comma separated
  enabled: boolean;
}

interface RuntimeConfig {
  primaryModel: string;
  fallbackModels: string[];
  visionModel: string;
  temperature: string;
}

interface LLMChannelEditorProps {
  busy?: boolean;
}

const PROTOCOL_OPTIONS = [
  { value: 'openai', label: 'OpenAI (compatible)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'vertex_ai', label: 'Google Vertex AI' },
  { value: 'ollama', label: 'Ollama (local)' },
];

const CHANNEL_PRESETS: Record<string, { label: string; protocol: ChannelProtocol; baseUrl: string; placeholder: string }> = {
  custom: { label: '自定义 / OpenAI 兼容', protocol: 'openai', baseUrl: '', placeholder: 'gpt-4o, gpt-3.5-turbo' },
  deepseek: { label: 'DeepSeek 官方', protocol: 'deepseek', baseUrl: 'https://api.deepseek.com', placeholder: 'deepseek-chat, deepseek-reasoner' },
  gemini: { label: 'Google Gemini 官方', protocol: 'gemini', baseUrl: '', placeholder: 'gemini-1.5-pro, gemini-1.5-flash' },
  anthropic: { label: 'Anthropic Claude 官方', protocol: 'anthropic', baseUrl: '', placeholder: 'claude-3-5-sonnet-20240620' },
  ollama: { label: 'Ollama (本地)', protocol: 'ollama', baseUrl: 'http://localhost:11434/v1', placeholder: 'llama3, qwen2' },
};

const MODEL_PLACEHOLDERS: Record<ChannelProtocol, string> = {
  openai: 'gpt-4o, gpt-3.5-turbo',
  deepseek: 'deepseek-chat, deepseek-reasoner',
  gemini: 'gemini-1.5-pro, gemini-1.5-flash',
  anthropic: 'claude-3-5-sonnet-20240620',
  vertex_ai: 'google/gemini-1.5-pro',
  ollama: 'llama3, qwen2',
};

interface TestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  text: string;
}

interface ChannelRowProps {
  channel: LLMChannel;
  index: number;
  busy: boolean;
  visibleKey: boolean;
  expanded: boolean;
  testState: TestState | undefined;
  onUpdate: (index: number, key: keyof LLMChannel, value: any) => void;
  onRemove: (index: number) => void;
  onToggleExpand: (index: number) => void;
  onToggleKeyVisibility: (index: number) => void;
  onTest: (channel: LLMChannel, index: number) => void;
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
  const displayName = channel.name || `渠道 #${index + 1}`;
  const modelCount = channel.models.split(',').filter(Boolean).length;
  const preset = Object.values(CHANNEL_PRESETS).find(p => p.protocol === channel.protocol);
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
        <span 
          className="text-[11px] text-muted-text w-4 shrink-0 transition-transform duration-200" 
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>

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
                onChange={(v) => onUpdate(index, 'protocol', v as ChannelProtocol)}
                options={PROTOCOL_OPTIONS}
                disabled={busy}
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

export const LLMChannelEditor: React.FC<LLMChannelEditorProps> = ({ busy: externalBusy = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; type: 'success' | 'local-error' | null } | null>(null);
  const [error, setError] = useState<ParsedApiError | null>(null);

  const [channels, setChannels] = useState<LLMChannel[]>([]);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>({
    primaryModel: '',
    fallbackModels: [],
    visionModel: '',
    temperature: '0.7',
  });
  const [managesRuntimeConfig, setManagesRuntimeConfig] = useState(true);
  const [configVersion, setConfigVersion] = useState('');

  const [addPreset, setAddPreset] = useState('custom');
  const [visibleKeys, setVisibleKeys] = useState<Record<number, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const [testStates, setTestStates] = useState<Record<number, TestState>>({});

  const busy = externalBusy || isInitialLoading || isSaving;

  const loadConfig = async () => {
    try {
      setIsInitialLoading(true);
      const data = await systemConfigApi.getConfig();
      
      setConfigVersion(data.configVersion);
      
      // Parse llm_channels from items
      const channelsItem = data.items.find(i => i.key === 'llm_channels');
      if (channelsItem?.value) {
        setChannels(JSON.parse(channelsItem.value as string));
      }
      
      // Parse llm_runtime_config from items
      const runtimeItem = data.items.find(i => i.key === 'llm_runtime_config');
      if (runtimeItem?.value) {
        setRuntimeConfig(JSON.parse(runtimeItem.value as string));
      }

      // Check for presence of LITELLM_CONFIG to determine UI mode
      const hasLitellmConfig = data.items.some(i => i.key === 'LITELLM_CONFIG' && (i.value as string)?.trim());
      setManagesRuntimeConfig(!hasLitellmConfig);

      setError(null);
    } catch (err) {
      setError(getParsedApiError(err));
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const [hasChanges, setHasChanges] = useState(false);
  useEffect(() => {
    if (!isInitialLoading) setHasChanges(true);
  }, [channels, runtimeConfig]);

  const addChannel = () => {
    const preset = CHANNEL_PRESETS[addPreset];
    const newChannel: LLMChannel = {
      name: addPreset === 'custom' ? '' : addPreset,
      protocol: preset.protocol,
      baseUrl: preset.baseUrl,
      apiKey: '',
      models: preset.placeholder,
      enabled: true,
    };
    setChannels([...channels, newChannel]);
    setExpandedRows({ ...expandedRows, [channels.length]: true });
  };

  const removeChannel = (index: number) => {
    setChannels(channels.filter((_, i) => i !== index));
    const newVisibleKeys = { ...visibleKeys };
    delete newVisibleKeys[index];
    setVisibleKeys(newVisibleKeys);
  };

  const updateChannel = (index: number, key: keyof LLMChannel, value: any) => {
    const newChannels = [...channels];
    newChannels[index] = { ...newChannels[index], [key]: value };
    setChannels(newChannels);
  };

  const toggleExpand = (index: number) => {
    setExpandedRows({ ...expandedRows, [index]: !expandedRows[index] });
  };

  const toggleKeyVisibility = (index: number) => {
    setVisibleKeys({ ...visibleKeys, [index]: !visibleKeys[index] });
  };

  const handleTest = async (channel: LLMChannel, index: number) => {
    setTestStates({ ...testStates, [index]: { status: 'loading', text: '正在测试...' } });
    try {
      const result = await systemConfigApi.testLLMChannel({
        protocol: channel.protocol,
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        name: channel.name,
        models: channel.models.split(',').map(m => m.trim()).filter(Boolean),
        enabled: channel.enabled
      });
      if (result.success) {
        setTestStates({ ...testStates, [index]: { status: 'success', text: `成功: ${result.message}` } });
      } else {
        setTestStates({ ...testStates, [index]: { status: 'error', text: `失败: ${result.message}` } });
      }
    } catch (err) {
      const apiErr = getParsedApiError(err);
      setTestStates({ ...testStates, [index]: { status: 'error', text: apiErr.message } });
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);
      await systemConfigApi.update({
        configVersion,
        items: [
          { key: 'llm_channels', value: JSON.stringify(channels) },
          { key: 'llm_runtime_config', value: JSON.stringify(runtimeConfig) }
        ]
      });
      setSaveMessage({ text: '配置已保存并生效', type: 'success' });
      setHasChanges(false);
      setError(null);
      setTimeout(() => setSaveMessage(null), 3000);
      void loadConfig(); // Refresh version
    } catch (err) {
      const apiErr = getParsedApiError(err);
      setError(apiErr);
      setSaveMessage({ text: apiErr.message, type: 'local-error' });
    } finally {
      setIsSaving(false);
    }
  };

  const availableModels = useMemo(() => {
    const allModels = channels
      .filter(c => c.enabled)
      .flatMap(c => c.models.split(',').map(m => m.trim()).filter(Boolean));
    return Array.from(new Set(allModels));
  }, [channels]);

  const toggleFallbackModel = (model: string) => {
    const current = runtimeConfig.fallbackModels;
    if (current.includes(model)) {
      setRuntimeConfig({ ...runtimeConfig, fallbackModels: current.filter(m => m !== model) });
    } else {
      setRuntimeConfig({ ...runtimeConfig, fallbackModels: [...current, model] });
    }
  };

  const setPrimaryModel = (model: string) => {
    setRuntimeConfig({
      ...runtimeConfig,
      primaryModel: model,
      fallbackModels: runtimeConfig.fallbackModels.filter(m => m !== model),
    });
  };

  if (error && !channels.length) {
    return (
      <div className="p-4">
        <ApiErrorAlert error={error} actionLabel="重试" onAction={() => void loadConfig()} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-cyan/20 bg-elevated/40 backdrop-blur-md p-5 shadow-glow-cyan/5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left group"
        onClick={() => setIsCollapsed((prev) => !prev)}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012-2v2M7 7h10" />
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
                    onChange={(e) => setRuntimeConfig({ ...runtimeConfig, temperature: e.target.value })}
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
                        options={[
                          { value: '', label: '自动（使用第一个可用模型）' },
                          ...availableModels.map(m => ({ value: m, label: m }))
                        ]}
                        disabled={busy}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="mb-2 text-xs font-semibold text-muted-text uppercase tracking-wider">Vision 模型 (多模态)</label>
                      <Select
                        className="h-10"
                        value={runtimeConfig.visionModel}
                        onChange={(v) => setRuntimeConfig({ ...runtimeConfig, visionModel: v })}
                        options={[
                          { value: '', label: '自动（跟随 Vision 默认逻辑）' },
                          ...availableModels.map(m => ({ value: m, label: m }))
                        ]}
                        disabled={busy}
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
            <div className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success animate-in slide-in-from-bottom-2 mt-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {saveMessage.text}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
