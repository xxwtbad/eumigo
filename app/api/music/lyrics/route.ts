import { NextRequest } from "next/server";

// 使用代理服务器避免服务器IP被网易云封禁
const METING_API_URL = process.env.METING_API_URL || "https://api.i-meto.com/meting";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lyricId = searchParams.get("lyric_id");

  if (!lyricId) {
    return new Response("缺少 lyric_id 参数", { status: 400 });
  }

  try {
    const url = `${METING_API_URL}/api?server=netease&type=lyric&id=${lyricId}`;
    const res = await fetch(url);
    const data = await res.json();
    const lrc = data.lyric || data.lrc || "";

    if (!lrc) {
      return new Response("暂无歌词", { status: 200 });
    }

    return new Response(lrc, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Lyric proxy error:", err);
    return new Response("歌词获取失败", { status: 500 });
  }
}
