import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FileText, Image as ImageIcon, PenLine } from 'lucide-react';
import { useNotesStore } from '../store/notes';
import { useOrganizeStore } from '../store/organize';
import { formatCount, formatRelativeTime } from '../lib/format';

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-line/70 bg-surface/70 p-4 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-[12px] text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-2 font-mono text-[26px] font-bold leading-none text-text">
        {formatCount(value)}
        {suffix ? <span className="ml-1 text-[13px] font-normal text-faint">{suffix}</span> : null}
      </div>
    </div>
  );
}

export function StatsPage() {
  const meta = useNotesStore((state) => state.meta);
  const titles = useNotesStore((state) => state.titles);
  const tagItems = useOrganizeStore((state) => state.tags);
  const notebookItems = useOrganizeStore((state) => state.notebooks);

  const active = useMemo(() => meta.filter((note) => !note.deletedAt), [meta]);
  const totalWords = useMemo(() => active.reduce((sum, note) => sum + note.wordCount, 0), [active]);
  const attachmentCount = useMemo(
    () => active.reduce((sum, note) => sum + note.attachmentCount, 0),
    [active],
  );
  const recent = useMemo(
    () => [...active].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [active],
  );
  const tagStats = useMemo(
    () =>
      tagItems
        .map((tag) => ({
          name: tag.name,
          value: active.filter((note) => note.tagIds.includes(tag.id)).length,
          color: tag.color,
        }))
        .filter((item) => item.value > 0)
        .sort((a, b) => b.value - a.value),
    [tagItems, active],
  );
  const notebookStats = useMemo(
    () =>
      notebookItems
        .map((notebook) => ({
          name: notebook.name,
          value: active.filter((note) => note.notebookId === notebook.id).length,
        }))
        .filter((item) => item.value > 0),
    [notebookItems, active],
  );

  const pieColors = ['#7C6CF6', '#F0B429', '#3FB27F', '#3B82F6', '#E5484D', '#9C8CFF'];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-5 md:py-8">
        <header>
          <h1 className="text-heading text-text">统计</h1>
          <p className="mt-1 text-[13px] text-muted">全部统计均在本地解密后计算</p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard icon={<FileText size={14} />} label="笔记总数" value={active.length} suffix="篇" />
          <StatCard icon={<PenLine size={14} />} label="总字数" value={totalWords} suffix="字" />
          <StatCard icon={<ImageIcon size={14} />} label="图片附件" value={attachmentCount} suffix="张" />
        </div>

        <section className="rounded-2xl border border-line/70 bg-surface/70 p-4 backdrop-blur-xl">
          <h2 className="text-subheading text-text">最近编辑</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">还没有笔记</p>
          ) : (
            <ol className="mt-4 space-y-3 border-l border-line pl-4">
              {recent.map((note) => (
                <li key={note.id} className="relative">
                  <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="truncate text-[13.5px] text-text">{titles[note.id] || '无标题'}</div>
                  <div className="text-[11.5px] text-faint">
                    {formatRelativeTime(note.updatedAt)} · {note.wordCount} 字
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-line/70 bg-surface/70 p-4 backdrop-blur-xl">
            <h2 className="text-subheading text-text">标签分布</h2>
            {tagStats.length === 0 ? (
              <p className="mt-3 text-[13px] text-faint">还没有标签数据</p>
            ) : (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagStats} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={72}
                      tick={{ fill: 'rgb(var(--muted))', fontSize: 12 }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgb(var(--surface-2))' }}
                      contentStyle={{
                        background: 'rgb(var(--surface))',
                        border: '1px solid rgb(var(--line))',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'rgb(var(--text))',
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={16}>
                      {tagStats.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-line/70 bg-surface/70 p-4 backdrop-blur-xl">
            <h2 className="text-subheading text-text">笔记本占比</h2>
            {notebookStats.length === 0 ? (
              <p className="mt-3 text-[13px] text-faint">还没有归类到笔记本的笔记</p>
            ) : (
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={notebookStats}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="55%"
                      outerRadius="82%"
                      paddingAngle={3}
                      stroke="none"
                    >
                      {notebookStats.map((item, index) => (
                        <Cell key={item.name} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'rgb(var(--surface))',
                        border: '1px solid rgb(var(--line))',
                        borderRadius: 12,
                        fontSize: 12,
                        color: 'rgb(var(--text))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
