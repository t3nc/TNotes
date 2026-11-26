import { argon2id } from 'hash-wasm';
import { webcrypto } from 'node:crypto';

const BASE = process.env.TNOTES_BASE ?? 'http://127.0.0.1:8787';
const SETUP_TOKEN = process.env.TNOTES_SETUP_TOKEN ?? '';
const PASSWORD = process.env.TNOTES_TEST_PASSWORD ?? 'tnotes-test-password';
const PLAINTEXT_TITLE = '机密标题 SmokeTitle';
const PLAINTEXT_BODY = '机密正文 secret body content';

const crypto = webcrypto;
const enc = new TextEncoder();

function toBase64(bytes) {
  return Buffer.from(bytes).toString('base64');
}
function fromBase64(text) {
  return new Uint8Array(Buffer.from(text, 'base64'));
}
async function hmac(key, data) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}
async function hkdf(ikm, salt, info, length = 32) {
  const prk = await hmac(salt, ikm);
  const infoBytes = enc.encode(info);
  const out = new Uint8Array(length);
  let prev = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  while (offset < length) {
    const input = new Uint8Array(prev.length + infoBytes.length + 1);
    input.set(prev, 0);
    input.set(infoBytes, prev.length);
    input[input.length - 1] = counter;
    prev = await hmac(prk, input);
    out.set(prev.subarray(0, Math.min(prev.length, length - offset)), offset);
    offset += prev.length;
    counter += 1;
  }
  return out;
}
async function aesEncrypt(key, iv, plaintext, aad) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const params = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = enc.encode(aad);
  return new Uint8Array(await crypto.subtle.encrypt(params, cryptoKey, plaintext));
}
async function aesDecrypt(key, iv, ciphertext, aad) {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['decrypt']);
  const params = { name: 'AES-GCM', iv };
  if (aad) params.additionalData = enc.encode(aad);
  return new Uint8Array(await crypto.subtle.decrypt(params, cryptoKey, ciphertext));
}
function randomBytes(length) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

let failures = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log('PASS  ' + name);
  } else {
    failures += 1;
    console.log('FAIL  ' + name + (detail ? ' -> ' + detail : ''));
  }
}

const cookieJar = new Map();
function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([key, value]) => key + '=' + value)
    .join('; ');
}
function storeCookies(res) {
  const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  for (const line of raw) {
    const pair = line.split(';')[0];
    const index = pair.indexOf('=');
    cookieJar.set(pair.slice(0, index), pair.slice(index + 1));
  }
}

async function call(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers ?? {}) };
  const cookie = cookieHeader();
  if (cookie) headers.Cookie = cookie;
  let body;
  if (options.raw) {
    body = options.raw;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const res = await fetch(BASE + path, { ...options, headers, body, redirect: 'manual' });
  storeCookies(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
}

async function encryptJson(key, value, aad) {
  const iv = randomBytes(12);
  const cipher = await aesEncrypt(key, iv, enc.encode(JSON.stringify(value)), aad);
  return { cipher: toBase64(cipher), iv: toBase64(iv) };
}

const kdfParams = {
  algo: 'argon2id',
  memorySize: 19456,
  iterations: 2,
  parallelism: 1,
  hashLength: 32,
  saltLength: 16,
};

async function derive(salt) {
  const master = new Uint8Array(
    await argon2id({
      password: PASSWORD,
      salt,
      parallelism: 1,
      iterations: 2,
      memorySize: 19456,
      hashLength: 32,
      outputType: 'binary',
    }),
  );
  const kWrap = await hkdf(master, salt, 'tnotes:wrap:v1');
  const kLogin = await hkdf(master, salt, 'tnotes:auth:v1');
  const loginSecret = toBase64(await hmac(kLogin, enc.encode('tnotes:login:v1')));
  return { master, kWrap, kLogin, loginSecret };
}
async function main() {
  const state = await call('/api/auth/state');
  check('读取初始化状态', state.status === 200, 'status=' + state.status);

  let salt;
  let loginSecret;
  let kWrap;

  if (state.json && state.json.initialized) {
    check('笔记库已初始化（复用现有库）', Boolean(state.json.salt));
    salt = fromBase64(state.json.salt);
    const derived = await derive(salt);
    loginSecret = derived.loginSecret;
    kWrap = derived.kWrap;
    const login = await call('/api/auth/login', { method: 'POST', body: { loginSecret } });
    check('用已知密码登录现有库', login.status === 200, 'status=' + login.status);
    if (login.status !== 200) {
      console.log('SKIP  后续用例（无法登录）');
      process.exit(1);
    }
  } else {
    if (!SETUP_TOKEN) {
      console.log('需要初始化令牌：请设置环境变量 TNOTES_SETUP_TOKEN 后重试');
      process.exit(1);
    }
    salt = randomBytes(16);
    const derived = await derive(salt);
    loginSecret = derived.loginSecret;
    kWrap = derived.kWrap;

    const setup = await call('/api/auth/setup', {
      method: 'POST',
      body: {
        setupToken: SETUP_TOKEN,
        displayName: 'Smoke',
        salt: toBase64(salt),
        kdfParams,
        loginSecret,
        wrappedKey: await (async () => {
          const kEnc = randomBytes(32);
          const iv = randomBytes(12);
          return { cipher: toBase64(await aesEncrypt(kWrap, iv, kEnc, 'tnotes:wrap:v1')), iv: toBase64(iv) };
        })(),
      },
    });
    check('初始化笔记库', setup.status === 201, 'status=' + setup.status + ' body=' + setup.text.slice(0, 120));
  }

  const kEnc = randomBytes(32);
  const title = await encryptJson(kEnc, PLAINTEXT_TITLE, 'tnotes:title:v1');
  const body = await encryptJson(kEnc, { doc: { type: 'doc', content: [{ type: 'paragraph' }] } }, 'tnotes:note:v1');

  const created = await call('/api/notes', {
    method: 'POST',
    body: { cipher: body.cipher, iv: body.iv, titleCipher: title.cipher, titleIv: title.iv, wordCount: 6 },
  });
  check('创建笔记', created.status === 201, 'status=' + created.status + ' body=' + created.text.slice(0, 120));
  const noteId = created.json && created.json.note ? created.json.note.id : null;
  check('返回笔记 id', Boolean(noteId));

  const list = await call('/api/notes');
  check('列出笔记', list.status === 200 && Array.isArray(list.json.notes), 'status=' + list.status);
  check('列表不包含明文标题', !list.text.includes(PLAINTEXT_TITLE));
  check('列表不包含明文正文', !list.text.includes(PLAINTEXT_BODY));
  check('列表包含标题密文', Boolean(list.json.notes[0] && list.json.notes[0].titleCipher));

  const withContent = await call('/api/notes?include=content');
  check('按需返回正文密文', Boolean(withContent.json.notes[0] && withContent.json.notes[0].cipher));

  const imageBytes = randomBytes(1024);
  const fileSalt = randomBytes(16);
  const fileIv = randomBytes(12);
  const kFile = await hkdf(kEnc, fileSalt, 'tnotes:file:v1');
  const fileCipher = await aesEncrypt(kFile, fileIv, imageBytes, 'tnotes:file:v1');
  const upload = await call('/api/attachments', {
    method: 'POST',
    raw: fileCipher,
    headers: {
      'Content-Type': 'application/octet-stream',
      'x-tnotes-note-id': noteId,
      'x-tnotes-mime': 'image/png',
      'x-tnotes-salt': toBase64(fileSalt),
      'x-tnotes-iv': toBase64(fileIv),
    },
  });
  check('上传加密图片', upload.status === 201, 'status=' + upload.status + ' body=' + upload.text.slice(0, 120));
  const attachmentId = upload.json && upload.json.attachment ? upload.json.attachment.id : null;

  const download = await call('/api/attachments/' + attachmentId);
  check('下载图片密文', download.status === 200, 'status=' + download.status + ' body=' + download.text.slice(0, 120));
  if (download.status === 200) {
    const downloaded = await aesDecrypt(
      kFile,
      fromBase64(download.json.attachment.iv),
      fromBase64(download.json.attachment.cipher),
      'tnotes:file:v1',
    );
    check('图片解密后与原图一致', Buffer.from(downloaded).equals(Buffer.from(imageBytes)));
  }

  const trashed = await call('/api/notes/' + noteId, { method: 'DELETE' });
  check('移入回收站', trashed.status === 200);
  const restored = await call('/api/notes/' + noteId + '/restore', { method: 'POST' });
  check('从回收站恢复', restored.status === 200);

  const purged = await call('/api/notes/' + noteId + '?permanent=1', { method: 'DELETE' });
  check('彻底删除', purged.status === 200);

  const logout = await call('/api/auth/logout', { method: 'POST' });
  check('登出成功', logout.status === 200, 'status=' + logout.status);
  const unauthorized = await call('/api/notes');
  check('登出后接口返回 401', unauthorized.status === 401, 'status=' + unauthorized.status);

  const badLogin = await call('/api/auth/login', {
    method: 'POST',
    body: { loginSecret: toBase64(randomBytes(32)) },
  });
  check('错误密码登录被拒绝', badLogin.status === 401, 'status=' + badLogin.status);

  const goodLogin = await call('/api/auth/login', { method: 'POST', body: { loginSecret } });
  check('正确密码登录成功', goodLogin.status === 200, 'status=' + goodLogin.status);
  check('登录返回包裹密钥', Boolean(goodLogin.json.wrappedKey && goodLogin.json.wrappedKey.cipher));

  const unwrapped = await aesDecrypt(
    kWrap,
    fromBase64(goodLogin.json.wrappedKey.iv),
    fromBase64(goodLogin.json.wrappedKey.cipher),
    'tnotes:wrap:v1',
  );
  check('可用密码解开数据密钥', unwrapped.length === 32);

  console.log(failures === 0 ? 'ALL SMOKE CHECKS PASSED' : failures + ' CHECKS FAILED');
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('SMOKE ERROR', error);
  process.exit(1);
});
