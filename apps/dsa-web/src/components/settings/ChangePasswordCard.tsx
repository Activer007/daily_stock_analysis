import type React from 'react';
import { useState } from 'react';
import type { ParsedApiError } from '../../api/error';
import { isParsedApiError } from '../../api/error';
import { useAuth } from '../../hooks';
import { Button, Input, EyeToggleIcon } from '../common';
import { SettingsAlert } from './SettingsAlert';
import { SettingsSectionCard } from './SettingsSectionCard';

export const ChangePasswordCard: React.FC = () => {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | ParsedApiError | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword.trim()) {
      setError('请输入当前密码');
      return;
    }
    if (!newPassword.trim()) {
      setError('请输入新密码');
      return;
    }
    if (newPassword.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError('两次输入的新密码不一致');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(currentPassword, newPassword, newPasswordConfirm);
      if (result.success) {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        setError(result.error ?? '修改失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SettingsSectionCard
      title="修改密码"
      description="更新当前管理员登录密码。修改成功后，后续登录请使用新密码。"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Input
              id="change-pass-current"
              type={showCurrent ? 'text' : 'password'}
              className="input-terminal border-border/55 border-cyan/40 transition-all duration-200"
              label="当前密码"
              placeholder="输入当前密码"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="current-password"
              trailingAction={(
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                  disabled={isSubmitting}
                  onClick={() => setShowCurrent((v) => !v)}
                  title={showCurrent ? '隐藏' : '显示'}
                  aria-label={showCurrent ? '隐藏当前密码' : '显示当前密码'}
                >
                  <EyeToggleIcon visible={showCurrent} />
                </button>
              )}
            />
          </div>

          <div className="space-y-3">
            <Input
              id="change-pass-new"
              type={showNew ? 'text' : 'password'}
              className="input-terminal border-border/55 transition-all duration-200"
              label="新密码"
              hint="至少 6 位。"
              placeholder="输入新密码"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              autoComplete="new-password"
              trailingAction={(
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                  disabled={isSubmitting}
                  onClick={() => setShowNew((v) => !v)}
                  title={showNew ? '隐藏' : '显示'}
                  aria-label={showNew ? '隐藏新密码' : '显示新密码'}
                >
                  <EyeToggleIcon visible={showNew} />
                </button>
              )}
            />
          </div>
        </div>

        <div className="space-y-3 md:max-w-md">
          <Input
            id="change-pass-confirm"
            type={showConfirm ? 'text' : 'password'}
            className="input-terminal border-cyan/40 transition-all duration-200"
            label="确认新密码"
            placeholder="再次输入新密码"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            disabled={isSubmitting}
            autoComplete="new-password"
            trailingAction={(
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-muted-text shadow-soft-card transition-all hover:bg-white/10 hover:text-white"
                disabled={isSubmitting}
                onClick={() => setShowConfirm((v) => !v)}
                title={showConfirm ? '隐藏' : '显示'}
                aria-label={showConfirm ? '隐藏确认密码' : '显示确认密码'}
              >
                <EyeToggleIcon visible={showConfirm} />
              </button>
            )}
          />
        </div>

        {error
          ? isParsedApiError(error)
            ? <SettingsAlert title="修改失败" message={error.message} variant="error" className="!mt-3" />
            : <SettingsAlert title="修改失败" message={error} variant="error" className="!mt-3" />
          : null}
        {success ? (
          <SettingsAlert title="修改成功" message="管理员密码已更新。" variant="success" />
        ) : null}

        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          保存新密码
        </Button>
      </form>
    </SettingsSectionCard>
  );
};
