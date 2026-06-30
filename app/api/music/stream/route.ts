import { NextRequest } from "next/server";

// 使用代理服务器避免服务器IP被网易云封禁
const METING_API_URL = process.env.METING_API_URL || "https://meting-api.vercel.app";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const urlId = searchParams.get("url_id");

  if (!urlId) {
    return new Response("缺少 url_id 参数", { status: 400 });
  }

  try {
    const url = `${METING_API_URL}/api?server=netease&type=url&id=${urlId}&br=320`;
    const res = await fetch(url);
    const data = await res.json();
    const src = (data.url || "").replace(/^http:\/\//, "https://");

    if (!src) {
      return new Response("获取音乐链接失败", { status: 404 });
    }

    // 流式转发：实时拉取网易云最新链接，避免 CDN 过期
    const audioRes = await fetch(src, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Referer: "https://music.163.com/",
      },
    });

    if (!audioRes.ok) {
      return new Response("音乐资源不可用", { status: audioRes.status });
    }

    return new Response(audioRes.body, {
      status: 200,
      headers: {
        "Content-Type": audioRes.headers.get("Content-Type") || "audio/mpeg",
        "Content-Length": audioRes.headers.get("Content-Length") || "",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Music stream proxy error:", err);
    return new Response("流媒体代理失败", { status: 500 });
  }
}
