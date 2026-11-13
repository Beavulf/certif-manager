// Локальный стаб AD-авторизации для превью на dev-машине.
// Заменяет WEB AD Tools (AUTH_URL=localhost:3005) на время просмотра UI.
// Принимает любые логин/пароль и возвращает JWT, который приложение
// декодирует через jwtDecode (подпись не проверяется by design).
import http from 'node:http';

const PORT = 3005;

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function issueToken(username) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'none', typ: 'JWT' };
  const payload = {
    sub: `demo-${username}`,
    username,
    preferred_username: username,
    displayName: username,
    iat: now,
    exp: now + 60 * 60 * 2,
  };
  return `${b64url(header)}.${b64url(payload)}.`;
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(404).end();
    return;
  }

  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    let operationName = 'Auth';
    let username = '';
    try {
      const parsed = JSON.parse(body || '{}');
      operationName = parsed.operationName ?? 'Auth';
      username = parsed.variables?.data?.username ?? 'demo';
    } catch {
      // пустое/битое тело — отвечаем ошибкой GraphQL ниже
    }

    if (operationName === 'Auth') {
      if (!username.trim()) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ errors: [{ message: 'Не верный логин или пароль' }] }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: { auth: { accessToken: issueToken(username) } } }));
      return;
    }

    // Прочие операции (searchUser и т.п.) — пустой результат.
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { searchUser: [] } }));
  });
});

server.listen(PORT, () => {
  console.log(`[auth-mock] listening on http://localhost:${PORT}`);
});
