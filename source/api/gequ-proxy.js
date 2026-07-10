/**
 * Vercel Serverless Function — 歌曲宝 API 代理
 * GET /api/gequ-proxy?id=203725451
 */
export default async function handler(request) {
  var url = new URL(request.url);
  var gequId = url.searchParams.get('id');

  if (!gequId) {
    return new Response(JSON.stringify({ code: 0, msg: '缺少 id 参数' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
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
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
