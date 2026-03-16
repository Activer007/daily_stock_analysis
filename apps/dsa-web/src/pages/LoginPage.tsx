import type React from 'react';
import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from "motion/react";
import { Lock, Loader2, Cpu, TrendingUp, Network, ShieldCheck } from "lucide-react";
import { Button, Input, ParticleBackground } from '../components/common';
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

  const isFirstTime = !passwordSet;

  // 3D Tilt effect values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the mouse movement
  const smoothX = useSpring(mouseX, { damping: 30, stiffness: 200 });
  const smoothY = useSpring(mouseY, { damping: 30, stiffness: 200 });

  // Map mouse position to rotation
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      mouseX.set(x);
      mouseY.set(y);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

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
    <div className="relative flex min-h-screen flex-col justify-center bg-[#030712] py-12 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500/30 overflow-hidden [perspective:1500px]">
      {/* Dynamic Background */}
      <ParticleBackground />

      {/* Cyber Grid */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

      {/* Parallax Glowing Orbs */}
      <motion.div
        style={{
          x: useTransform(smoothX, [-0.5, 0.5], [-50, 50]),
          y: useTransform(smoothY, [-0.5, 0.5], [-50, 50]),
        }}
        className="absolute left-[20%] top-[20%] -z-10 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-600/20 blur-[100px]"
      />
      <motion.div
        style={{
          x: useTransform(smoothX, [-0.5, 0.5], [60, -60]),
          y: useTransform(smoothY, [-0.5, 0.5], [60, -60]),
        }}
        className="absolute right-[20%] bottom-[10%] -z-10 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-emerald-600/10 blur-[120px]"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center mb-8"
        >
          {/* Logo Icon */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B0E14] border border-slate-800 shadow-[0_0_30px_rgba(6,182,212,0.15)] group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Cpu className="absolute h-7 w-7 text-cyan-400 opacity-80 group-hover:scale-110 transition-transform duration-500" />
            <TrendingUp className="absolute h-3.5 w-3.5 text-emerald-400 translate-x-2.5 translate-y-2.5 opacity-90" />
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-[10px] font-medium text-cyan-300 backdrop-blur-sm"
          >
            <Network className="h-5 w-5" />
            <span>DAILY STOCK ANALYSIS</span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative group z-20 pointer-events-auto"
        >
          {/* Card Border Glow */}
          <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-cyan-500/20 to-blue-600/20 opacity-50 blur-sm group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none" />
          
          <div className="relative flex flex-col rounded-3xl bg-[#0B0E14]/80 p-8 shadow-2xl backdrop-blur-xl border border-white/5 overflow-hidden pointer-events-auto">
            {/* Inner corner glow */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-[50px]" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-blue-600/10 blur-[50px]" />

            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                {isFirstTime ? (
                  <>
                    <ShieldCheck className="h-6 w-6 text-emerald-400" />
                    <span>初始化访问控制</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 text-cyan-400" />
                    <span>管理员登录</span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {isFirstTime
                  ? '首次启用认证，请为系统工作台设置管理员密码。'
                  : '访问 DSA 量化决策引擎需要有效的身份凭证。'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  id="password"
                  type="password"
                  allowTogglePassword
                  iconType="password"
                  label={isFirstTime ? '管理员密码' : '登录密码'}
                  placeholder={isFirstTime ? '请设置 8 位以上密码' : '请输入密码'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  autoComplete={isFirstTime ? 'new-password' : 'current-password'}
                  className="!bg-white/5 !border-white/10 focus:!border-cyan-500/50"
                />

                {isFirstTime && (
                  <Input
                    id="passwordConfirm"
                    type="password"
                    allowTogglePassword
                    iconType="password"
                    label="确认密码"
                    placeholder="再次确认管理员密码"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className="!bg-white/5 !border-white/10 focus:!border-cyan-500/50"
                  />
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="overflow-hidden"
                >
                  <SettingsAlert
                    title={isFirstTime ? '配置失败' : '验证未通过'}
                    message={isParsedApiError(error) ? error.message : error}
                    variant="error"
                    className="!bg-red-500/10 !border-red-500/20 !text-red-400"
                  />
                </motion.div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full relative group/btn h-12 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-950/20 border-0"
                disabled={isSubmitting}
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{isFirstTime ? '初始化中...' : '正在建立连接...'}</span>
                    </>
                  ) : (
                    <span>{isFirstTime ? '完成设置并登录' : '登 录'}</span>
                  )}
                </div>
                {/* Button shine effect */}
                <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
              </Button>
            </form>
          </div>
        </motion.div>

        {/* Footer info */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center text-xs text-slate-500 tracking-wider font-mono uppercase"
        >
          Secure Connection Established via DSA-V3-TLS
        </motion.p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
};

export default LoginPage;
