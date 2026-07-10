/**
 * Vercel Node.js Serverless Function — 歌曲宝 API 代理
 * GET /api/gequ-proxy?id=203725451
 *
 * 诊断: 502 错误通常因为 req.query 在某些 Vercel 运行时不可用。
 * 改用 URL 手动解析查询参数，并使用 fetch API (Node 18+) 发起请求。
 */
module.exports = async function handler(req, res) {
  // --- CORS headers ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 预检请求
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  // --- 手动解析查询参数（兼容不同 Vercel 运行时） ---
  var id = null;
  try {
    var url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
    id = url.searchParams.get('id');
  } catch (e) {
    // 备选：简单正则匹配
    var m = (req.url || '').match(/[?&]id=([^&]+)/);
    if (m) id = decodeURIComponent(m[1]);
  }

  if (!id) {
    res.status(400).json({ code: 0, msg: '缺少 id 参数' });
    return;
  }

  // --- 代理请求 ---
  try {
    var result = await gequRequest(id);
    res.status(200).json(result);
  } catch (e) {
    res.status(502).json({ code: 0, msg: '代理请求失败: ' + (e.message || '') });
  }
};

async function gequRequest(id) {
  var body = JSON.stringify({ id: String(id) });

  var resp = await fetch('https://www.gequbao.net/api/play-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.gequbao.net/',
      'Origin': 'https://www.gequbao.net',
    },
    body: body,
  });

  if (!resp.ok) {
    throw new Error('gequbao 返回 HTTP ' + resp.status);
  }

  var data = await resp.json();
  return data;
}
