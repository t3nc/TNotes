import { useState } from 'react';
import { KeyRound, Lock, ShieldAlert, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useVaultStore } from '../store/vault';
import { useUiStore } from '../store/ui';
import { cn } from '../lib/cn';

function strengthOf(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '未输入', color: 'bg-line' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 14) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ['很弱', '偏弱', '一般', '不错', '很强', '很强'];
  const colors = ['bg-danger', 'bg-danger', 'bg-warn', 'bg-accent', 'bg-success', 'bg-success'];
  const index = Math.min(score, 5);
  return { score: index, label: labels[index], color: colors[index] };
}

export function SetupPage() {
  const navigate = useNavigate();
  const setup = useVaultStore((state) => state.setup);
  const busy = useVaultStore((state) => state.busy);
  const error = useVaultStore((state) => state.error);
  const clearError = useVaultStore((state) => state.clearError);
  const pushToast = useUiStore((state) => state.pushToast);

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const strength = strengthOf(password);

  const submit = () => {
    clearError();
    if (password.length < 8) {
      pushToast('密码至少 8 位', 'error');
      return;
    }
    if (password !== confirm) {
      pushToast('两次输入的密码不一致', 'error');
      return;
    }
    setup(password, displayName.trim(), setupToken.trim())
      .then((ok) => {
        if (ok) {
          pushToast('笔记库已创建，内容将全程加密', 'success');
          navigate('/app');
        }
      })
      .catch((err: unknown) => {
        console.error('[tnotes] 初始化失败', err);
      });
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <div className="animate-fade-up w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-deep text-2xl font-bold text-white shadow-[0_18px_40px_-16px_rgb(var(--primary)/0.95)]">
            T
          </div>
          <h1 className="text-heading text-text">创建你的加密笔记库</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            所有内容在浏览器内加密后上传，服务器只保存密文。
          </p>
        </div>

        <div className="rounded-3xl border border-line/80 bg-surface/80 p-5 shadow-card backdrop-blur-xl">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="display-name" className="text-[12.5px] text-muted">
                昵称（可选）
              </label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="比如：Wang"
                maxLength={40}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="setup-password" className="text-[12.5px] text-muted">
                访问密码
              </label>
              <Input
                id="setup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 8 位，建议 14 位以上"
                autoComplete="new-password"
              />
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <span
                      key={index}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        index < strength.score ? strength.color : 'bg-line',
                      )}
                    />
                  ))}
                </div>
                <span className="w-8 text-right text-[11.5px] text-faint">{strength.label}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="setup-confirm" className="text-[12.5px] text-muted">
                确认密码
              </label>
              <Input
                id="setup-confirm"
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="再输入一次"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="setup-token" className="text-[12.5px] text-muted">
                初始化令牌
              </label>
              <Input
                id="setup-token"
                value={setupToken}
                onChange={(event) => setSetupToken(event.target.value)}
                placeholder="部署时通过 wrangler secret put SETUP_TOKEN 设置"
              />
              <p className="text-[11.5px] leading-relaxed text-faint">
                令牌用于防止他人抢先占用你的笔记库，初始化后可从服务端移除。
              </p>
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
                {error}
              </div>
            ) : null}

            <Button
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={submit}
              icon={busy ? null : <Sparkles size={17} />}
            >
              {busy ? '正在生成密钥…' : '创建我的笔记库'}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-warn/30 bg-warn/5 px-3.5 py-3 text-[12px] leading-relaxed text-muted">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-warn" />
          <span>
            内容密钥由密码派生，<span className="text-text">忘记密码将无法恢复任何笔记</span>
            。请使用可信赖的密码管理器保存。
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-faint">
          <Lock size={13} />
          <span>已有密码？</span>
          <button
            type="button"
            className="text-primary transition hover:text-primary-soft"
            onClick={() => navigate('/login')}
          >
            去登录
          </button>
          <KeyRound size={13} className="ml-2" />
        </div>
      </div>
    </div>
  );
}
