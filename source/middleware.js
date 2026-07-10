/**
 * Vercel Edge Middleware
 * 1. 阻止浏览器直接访问 /source/ 目录（完整源码归档）
 * 2. 阻止浏览器直接访问 .md / .json 原始文件
 * 3. /api/gequ-proxy 代理歌曲宝 API（解决 CORS）
 * JS fetch 请求不受影响（通过 Sec-Fetch-Dest 头区分）
 */
export default async function middleware(request) {
  var url = new URL(request.url);
  var path = url.pathname;

  /* ---- 歌曲宝代理 ---- */
  if (path === '/api/gequ-proxy') {
    var gequId = url.searchParams.get('id');
    if (!gequId) {
      return new Response(JSON.stringify({ code: 0, msg: '缺少 id 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    try {
      var resp = await fetch('https://www.gequbao.net/api/play-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: gequId }),
      });
      var data = await resp.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ code: 0, msg: '代理请求失败' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /* /source/ 目录：阻止所有直接访问 */
  var isSource = path.startsWith('/source/') || path === '/source';
  /* 其他路径：仅拦截 .md 和 .json */
  var isRawFile = /\.(md|json)$/i.test(path);

  if (!isSource && !isRawFile) return;

  var dest = request.headers.get('sec-fetch-dest');
  if (dest === 'document') {
    var notFound = await fetch(new URL('/404.html', request.url));
    return new Response(notFound.body, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Robots-Tag': 'noindex',
      },
    });
  }

  /* /source/ 目录额外防护：非 document 的直接资源请求也阻止 */
  if (isSource) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'X-Robots-Tag': 'noindex' },
    });
  }
}

export var config = {
  matcher: [
    '/source/:path*',
    '/source',
    '/posts/:path*',
    '/links/:path*',
    '/about/:path*',
    '/poetry/:path*',
    '/songs/:path*',
    '/api/gequ-proxy',
  ],
};
