import { useState } from 'react';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useVaultStore } from '../store/vault';
import { cn } from '../lib/cn';

export function LoginPage() {
  const navigate = useNavigate();
  const unlock = useVaultStore((state) => state.unlock);
  const busy = useVaultStore((state) => state.busy);
  const error = useVaultStore((state) => state.error);
  const clearError = useVaultStore((state) => state.clearError);
  const [password, setPassword] = useState('');

  const submit = () => {
    clearError();
    unlock(password)
      .then((ok) => {
        if (ok) navigate('/app');
      })
      .catch((err: unknown) => {
        console.error('[tnotes] 解锁失败', err);
      });
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className={cn('animate-fade-up w-full max-w-sm')}>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-deep shadow-[0_20px_46px_-18px_rgb(var(--primary)/0.95)]">
            <span className="animate-breathe text-2xl font-bold text-white">T</span>
          </div>
          <h1 className="text-heading text-text">解锁你的笔记库</h1>
          <p className="mt-2 text-[13.5px] text-muted">输入访问密码以解密本设备上的内容</p>
        </div>

        <div
          className={cn(
            'rounded-3xl border border-line/80 bg-surface/80 p-5 shadow-card backdrop-blur-xl',
            error && 'animate-shake border-danger/50',
          )}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-[12.5px] text-muted">
                访问密码
              </label>
              <Input
                id="login-password"
                type="password"
                autoFocus
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                }}
                placeholder="输入密码"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
                {error}
              </div>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              disabled={busy || !password}
              onClick={submit}
              icon={busy ? <Loader2 size={17} className="animate-spin" /> : <Lock size={17} />}
            >
              {busy ? '正在派生密钥…' : '解锁'}
            </Button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-faint">
          <KeyRound size={13} />
          <span>还没有笔记库？</span>
          <button
            type="button"
            className="text-primary transition hover:text-primary-soft"
            onClick={() => navigate('/setup')}
          >
            去初始化
          </button>
        </div>
      </div>
    </div>
  );
}
