import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tnotes:install-dismissed';

export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  );

  useEffect(() => {
    const handler = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!event || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-line bg-surface/95 p-3.5 shadow-lift backdrop-blur-xl lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold text-text">把 TNotes 装到桌面</div>
          <div className="mt-1 text-[12px] leading-relaxed text-muted">
            安装后可独立窗口打开，离线也能查看已缓存的笔记。
          </div>
        </div>
        <button
          type="button"
          aria-label="关闭提示"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, '1');
            setDismissed(true);
          }}
          className="rounded-lg p-1 text-faint transition hover:bg-surface2 hover:text-text"
        >
          <X size={15} />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          event
            .prompt()
            .then(() => event.userChoice)
            .then(() => {
              localStorage.setItem(DISMISS_KEY, '1');
              setDismissed(true);
            })
            .catch((error: unknown) => {
              console.error('[tnotes] 安装提示失败', error);
            });
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
      >
        <Download size={15} />
        立即安装
      </button>
    </div>
  );
}
