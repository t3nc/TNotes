import { Hono } from 'hono';
import type { AppEnv } from './env';
import { securityHeaders } from './middleware/security';
import { requireSession } from './middleware/session';
import { errorBody } from './lib/http';
import { authRoutes } from './routes/auth';
import { noteRoutes } from './routes/notes';
import { notebookRoutes } from './routes/notebooks';
import { tagRoutes } from './routes/tags';
import { attachmentRoutes } from './routes/attachments';

const app = new Hono<AppEnv>();

app.use('*', securityHeaders);

app.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));

// 认证路由自带守卫，不挂全局会话中间件
app.route('/api/auth', authRoutes);

// 其余 API 必须携带有效会话
app.use('/api/*', requireSession);

app.route('/api/notes', noteRoutes);
app.route('/api/notebooks', notebookRoutes);
app.route('/api/tags', tagRoutes);
app.route('/api/attachments', attachmentRoutes);

app.onError((err, c) => {
  console.error('[tnotes] unhandled error:', err instanceof Error ? err.message : err);
  return c.json(errorBody('internal_error', '服务器内部错误'), 500);
});

app.notFound((c) => c.json(errorBody('not_found', '资源不存在'), 404));

export default app;

