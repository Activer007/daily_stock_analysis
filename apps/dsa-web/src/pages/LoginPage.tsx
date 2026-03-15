import type React from 'react';
import { useState } from 'react';
import { Badge, Button, Card, EyeToggleIcon, Input } from '../components/common';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { ParsedApiError } from '../api/error';
import { isParsedApiError } from '../api/error';
import { useAuth } from '../hooks';
import { SettingsAlert } from '../components/settings';

const LoginPage: React.FC = () => {
  const { login, passwordSet } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawRedirect = searchParams.get('redirect') ?? '';
  const redirect =
    rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | ParsedApiError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const isFirstTime = !passwordSet;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isFirstTime && password !== passwordConfirm) {
      setError('两次输入的密码不一致');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login(password, isFirstTime ? passwordConfirm : undefined);
      if (result.success) {
        navigate(redirect, { replace: true });
      } else {
        setError(result.error ?? '登录失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4">
      <Card className="w-full max-w-md" padding="lg" variant="bordered">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="mb-2 text-xl font-semibold text-foreground">
              {isFirstTime ? '设置初始密码' : '管理员登录'}
            </h1>
            <p className="text-sm leading-6 text-secondary-text">
              {isFirstTime
                ? '首次启用认证时，请设置管理员密码并再次确认。'
                : '请输入当前管理员密码以继续访问系统设置与工作台。'}
            </p>
          </div>
          <Badge variant={isFirstTime ? 'warning' : 'info'} size="sm">
            {isFirstTime ? '首次设置' : '需要登录'}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label={isFirstTime ? '新密码' : '密码'}
              placeholder={isFirstTime ? '输入新密码' : '输入密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              autoComplete={isFirstTime ? 'new-password' : 'current-password'}
              trailingAction={(
                <button
                  type="button"
                  className="btn-secondary flex h-8 w-8 items-center justify-center !rounded-lg !p-0"
                  onClick={() => setShowPassword((previous) => !previous)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  <EyeToggleIcon visible={showPassword} />
                </button>
              )}
            />
          </div>

          {isFirstTime ? (
            <div className="space-y-3">
              <Input
                id="passwordConfirm"
                type={showPasswordConfirm ? 'text' : 'password'}
                label="确认密码"
                placeholder="再次输入密码"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={isSubmitting}
                autoComplete="new-password"
                trailingAction={(
                  <button
                    type="button"
                    className="btn-secondary flex h-8 w-8 items-center justify-center !rounded-lg !p-0"
                    onClick={() => setShowPasswordConfirm((previous) => !previous)}
                    aria-label={showPasswordConfirm ? '隐藏确认密码' : '显示确认密码'}
                  >
                    <EyeToggleIcon visible={showPasswordConfirm} />
                  </button>
                )}
              />
            </div>
          ) : null}

          {error
            ? isParsedApiError(error)
              ? (
                <SettingsAlert
                  title={isFirstTime ? '设置失败' : '登录失败'}
                  message={error.message}
                  variant="error"
                  className="!mt-3"
                />
              )
              : (
                <SettingsAlert
                  title={isFirstTime ? '设置失败' : '登录失败'}
                  message={error}
                  variant="error"
                  className="!mt-3"
                />
              )
            : null}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            loadingText={isFirstTime ? '设置中...' : '登录中...'}
          >
            {isSubmitting ? (isFirstTime ? '设置中...' : '登录中...') : isFirstTime ? '设置密码' : '登录'}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;
