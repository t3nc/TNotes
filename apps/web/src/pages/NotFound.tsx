import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <Compass size={34} className="text-faint" />
      <div className="text-heading text-text">页面不存在</div>
      <p className="text-[13px] text-muted">这个地址没有对应的内容。</p>
      <Link
        to="/app"
        className="rounded-xl bg-primary px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
      >
        回到笔记库
      </Link>
    </div>
  );
}
