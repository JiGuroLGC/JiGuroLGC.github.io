var https = require('https');
var http = require('http');

/**
 * Vercel Node.js Serverless Function — 歌曲宝 API 代理
 * GET /api/gequ-proxy?id=203725451
 */
module.exports = async function handler(req, res) {
  var id = req.query.id;

  if (!id) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(400).json({ code: 0, msg: '缺少 id 参数' });
  }

  try {
    var result = await gequRequest(id);
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(result);
  } catch (e) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(502).json({ code: 0, msg: '代理请求失败: ' + (e.message || '') });
  }
};

function gequRequest(id) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify({ id: id });
    var url = new URL('https://www.gequbao.net/api/play-url');
    var mod = url.protocol === 'https:' ? https : http;

    var opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (compatible; VercelProxy/1.0)',
      },
      timeout: 10000,
    };

    var req = mod.request(opts, function(resp) {
      var chunks = [];
      resp.on('data', function(c) { chunks.push(c); });
      resp.on('end', function() {
        try {
          var data = JSON.parse(Buffer.concat(chunks).toString());
          resolve(data);
        } catch (e) {
          reject(new Error('JSON 解析失败'));
        }
      });
    });

    req.on('error', function(e) { reject(e); });
    req.on('timeout', function() { req.destroy(); reject(new Error('请求超时')); });
    req.write(body);
    req.end();
  });
}
