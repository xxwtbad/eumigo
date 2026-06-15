import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state") || "";
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId || clientId.length < 10) {
    return NextResponse.json(
      {
        error: "GitHub Client ID 无效或缺失",
        clientIdLength: clientId?.length ?? 0,
        envKeys: Object.keys(process.env).filter(
          k => k.includes("GITHUB") || k.includes("CLIENT")
        )
      },
      { status: 500 }
    );
  }
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=read:user&state=${encodeURIComponent(state)}`;
  return NextResponse.redirect(url);
}
