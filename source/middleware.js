/**
 * Vercel Edge Middleware
 * 1. 阻止浏览器直接访问 /source/ 目录（完整源码归档）
 * 2. 阻止浏览器直接访问 .md / .json 原始文件
 * JS fetch 请求不受影响（通过 Sec-Fetch-Dest 头区分）
 */
export default async function middleware(request) {
    var url = new URL(request.url);
    var path = url.pathname;

    /* /source/ 目录：阻止所有直接访问 */
    var isSource = path.startsWith('/source/') || path === '/source';
    /* 其他路径：仅拦截 .md .json .txt */
    var isRawFile = /\.(md|json|txt)$/i.test(path);

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
            headers: {
                'X-Robots-Tag': 'noindex'
            },
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
    ],
};