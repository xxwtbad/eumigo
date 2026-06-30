import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// 歌单是动态数据，不允许 Next.js / CDN 缓存
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// 使用代理服务器避免服务器IP被网易云封禁
const METING_API_URL = process.env.METING_API_URL || "https://api.i-meto.com/meting";

interface SongData {
  id: string;
  title: string;
  artist: string;
  cover: string;
  src: string;
  lrcUrl: string;
  type: "netease" | "local";
  /** 网易云 url_id，用于流代理实时拉取 */
  url_id?: string;
  /** 网易云 lyric_id，用于歌词代理实时拉取 */
  lyric_id?: string;
  /** 本地音乐数据库 ID，用于下载 */
  dbId?: number;
}

interface MetingTrack {
  id: string;
  title: string;
  author: string;
  url: string;
  pic: string;
  lrc: string;
}

async function getNeteaseSongs(playlistId: string | null, songIds: string | null): Promise<SongData[]> {
  let tracks: MetingTrack[] = [];

   try {
    if (playlistId) {
      const url = `${METING_API_URL}/api?server=netease&type=playlist&id=${playlistId}`;
      console.log("[Music API] Fetching playlist:", url);
      const res = await fetch(url);
      console.log("[Music API] Response status:", res.status);
      const text = await res.text();
      console.log("[Music API] Response body length:", text.length);
      try {
        const parsed = JSON.parse(text);
        tracks = Array.isArray(parsed) ? parsed : [];
      } catch (parseErr) {
        console.error("[Music API] JSON parse error:", parseErr);
        console.error("[Music API] Raw response:", text.substring(0, 500));
      }
    } else if (songIds) {
      const ids = songIds.split(",").map((s) => s.trim()).filter(Boolean);
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const url = `${METING_API_URL}/api?server=netease&type=song&id=${id}`;
            const res = await fetch(url);
            const parsed = await res.json();
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return [];
          }
        })
      );
      tracks = results.flat();
    }
  } catch (e) {
    console.error("[Music API] Error fetching tracks:", e);
    tracks = [];
  }

  const songs: SongData[] = tracks
    .filter((track) => track.url)
    .map((track) => {
      // 从url中提取id用于流代理
      const urlMatch = track.url.match(/[?&]id=([^&]+)/);
      const urlId = urlMatch ? urlMatch[1] : String(track.id);

      // 从lrc中提取id用于歌词代理
      const lrcMatch = track.lrc?.match(/[?&]id=([^&]+)/);
      const lyricId = lrcMatch ? lrcMatch[1] : String(track.id);

      return {
        id: String(track.id),
        title: track.title || "未知歌曲",
        artist: track.author || "未知歌手",
        cover: track.pic ? track.pic.replace(/^http:\/\//, "https://") : "",
        src: track.url.replace(/^http:\/\//, "https://"),
        lrcUrl: track.lrc ? track.lrc.replace(/^http:\/\//, "https://") : "",
        type: "netease" as const,
        url_id: urlId,
        lyric_id: lyricId,
      };
    });

  return songs;
}

async function getLocalSongs(): Promise<SongData[]> {
  const musics = await prisma.music.findMany({
    where: { type: "local" },
    orderBy: { sort: "asc" },
  });

  return musics.map((m) => {
    // 优先使用 lrcSrc（独立 LRC 文件），没有就用 lrc（数据库里嵌入的 LRC 文本）
    const lrcUrl =
      m.lrcSrc ||
      (m.lrc ? `/api/music/lrc-text?dbId=${m.id}` : "");
    return {
      id: `local-${m.id}`,
      title: m.title,
      artist: m.artist,
      cover: m.cover,
      src: m.src,
      lrcUrl,
      type: "local" as const,
      dbId: m.id,
    };
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");
    const playlistId = searchParams.get("id");
    const songIds = searchParams.get("ids");

    // 只获取本地音乐
    if (source === "local") {
      const songs = await getLocalSongs();
      return NextResponse.json(songs);
    }

    // 只获取网易云音乐
    if (source === "netease") {
      if (!playlistId && !songIds) {
        return NextResponse.json(
          { error: "需要提供 id (歌单ID) 或 ids (歌曲ID,逗号分隔)" },
          { status: 400 }
        );
      }
      const songs = await getNeteaseSongs(playlistId, songIds);
      return NextResponse.json(songs);
    }

    // 默认：合并两者（如果有网易云配置）
    let neteaseSongs: SongData[] = [];
    let localSongs: SongData[] = [];

    // 获取本地音乐
    localSongs = await getLocalSongs();

    // 如果有网易云配置，也获取网易云音乐
    if (playlistId || songIds) {
      try {
        neteaseSongs = await getNeteaseSongs(playlistId, songIds);
      } catch (e) {
        console.error("Netease fetch error:", e);
      }
    }

    // 合并：本地音乐在前，网易云在后
    const allSongs = [...localSongs, ...neteaseSongs];
    return NextResponse.json(allSongs);
  } catch (err) {
    console.error("Music API error:", err);
    return NextResponse.json(
      { error: "获取音乐数据失败" },
      { status: 500 }
    );
  }
}
