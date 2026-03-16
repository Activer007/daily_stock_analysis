import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { authApi } from '../../api/auth';
import { getParsedApiError, isParsedApiError, type ParsedApiError } from '../../api/error';
import { useAuth } from '../../hooks';
import { Badge, Button, EyeToggleIcon, Input } from '../common';
import { SettingsAlert } from './SettingsAlert';
import { SettingsSectionCard } from './SettingsSectionCard';

function createNextModeLabel(authEnabled: boolean, desiredEnabled: boolean) {
  if (authEnabled && !desiredEnabled) {
    return '关闭认证';
  }
  if (!authEnabled && desiredEnabled) {
    return '开启认证';
  }
  return authEnabled ? '保持已开启' : '保持已关闭';
}

export const AuthSettingsCard: React.FC = () => {
  const { authEnabled, refreshStatus } = useAuth();
  const [desiredEnabled, setDesiredEnabled] = useState(authEnabled);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | ParsedApiError | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDirty = desiredEnabled !== authEnabled || currentPassword || password || passwordConfirm;
  const targetActionLabel = createNextModeLabel(authEnabled, desiredEnabled);

  const helperText = useMemo(() => {
    if (authEnabled) {
      return '关闭认证需要输入当前管理员密码，以避免误操作导致会话失效。';
    }

    return '如果系统尚未设置管理员密码，请输入新密码和确认密码。若系统已保留密码，请留空新密码并输入当前密码重新开启认证。';
  }, [authEnabled]);

  useEffect(() => {
    setDesiredEnabled(authEnabled);
  }, [authEnabled]);

  const resetForm = () => {
    setCurrentPassword('');
    setPassword('');
    setPasswordConfirm('');
    setShowCurrentPassword(false);
    setShowPassword(false);
    setShowPasswordConfirm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!desiredEnabled && authEnabled && !currentPassword.trim()) {
      setError('关闭认证前请输入当前密码');
      return;
    }

    if (desiredEnabled && password && password !== passwordConfirm) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.updateSettings(
        desiredEnabled,
        password.trim() || undefined,
        passwordConfirm.trim() || undefined,
        currentPassword.trim() || undefined,
      );
      await refreshStatus();
      setSuccessMessage(desiredEnabled ? '认证设置已更新' : '认证已关闭');
      resetForm();
    } catch (err: unknown) {
      setError(getParsedApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsSectionCard
      title="认证与登录保护"
      description="在运行中的 Web 设置页里开启或关闭管理员认证。"
      actions={
        <Badge variant={authEnabled ? 'success' : 'default'} size="sm">
          {authEnabled ? '已开启' : '未开启'}
        </Badge>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="rounded-xl border border-white/10 bg-white/2 p-4 shadow-soft-card-strong transition-all hover:bg-white/5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">管理员认证</p>
              <p className="text-xs leading-6 text-muted-text">{helperText}</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 shadow-soft-card-strong transition-all hover:bg-white/10">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-white/20 bg-base text-cyan focus:ring-cyan/20"
                checked={desiredEnabled}
                onChange={(event) => setDesiredEnabled(event.target.checked)}
                disabled={isSubmitting}
              />
              <span className="text-xs font-medium text-white">
                {desiredEnabled ? '开启' : '关闭'}
              </span>
            </label>
          </div>
        </div>

        {desiredEnabled || authEnabled ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Input
                label={desiredEnabled && !authEnabled ? '当前密码（重新开启时使用）' : '当前密码'}
                type={showCurrentPassword ? 'text' : 'password'}
                className="focus:ring-4 focus:ring-cyan/15 focus:border-cyan/40 transition-all duration-200"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                hint={desiredEnabled && !authEnabled ? '如果系统已保留密码，请输入当前密码；首次启用可留空。' : undefined}
                trailingAction={(
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                    onClick={() => setShowCurrentPassword((previous) => !previous)}
                    aria-label={showCurrentPassword ? '隐藏当前密码' : '显示当前密码'}
                  >
                    <EyeToggleIcon visible={showCurrentPassword} />
                  </button>
                )}
              />
            </div>

            {desiredEnabled ? (
              <div className="space-y-3">
                <Input
                  label="新密码"
                  type={showPassword ? 'text' : 'password'}
                  className="focus:ring-4 focus:ring-cyan/15 focus:border-cyan/40 transition-all duration-200"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  hint="首次启用时填写；若仅重新开启已有密码，可留空。"
                  trailingAction={(
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? '隐藏新密码' : '显示新密码'}
                    >
                      <EyeToggleIcon visible={showPassword} />
                    </button>
                  )}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {desiredEnabled ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Input
                label="确认新密码"
                type={showPasswordConfirm ? 'text' : 'password'}
                className="focus:ring-4 focus:ring-cyan/15 focus:border-cyan/40 transition-all duration-200"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                autoComplete="new-password"
                disabled={isSubmitting}
                trailingAction={(
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                    onClick={() => setShowPasswordConfirm((previous) => !previous)}
                    aria-label={showPasswordConfirm ? '隐藏确认密码' : '显示确认密码'}
                  >
                    <EyeToggleIcon visible={showPasswordConfirm} />
                  </button>
                )}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          isParsedApiError(error) ? (
            <SettingsAlert
              title="认证设置失败"
              message={error.message}
              variant="error"
            />
          ) : (
            <SettingsAlert title="认证设置失败" message={error} variant="error" />
          )
        ) : null}

        {successMessage ? (
          <SettingsAlert title="操作成功" message={successMessage} variant="success" />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!isDirty}>
            {targetActionLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDesiredEnabled(authEnabled);
              setError(null);
              setSuccessMessage(null);
              resetForm();
            }}
            disabled={isSubmitting || !isDirty}
          >
            还原
          </Button>
        </div>
      </form>
    </SettingsSectionCard>
  );
};
