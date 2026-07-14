import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import {
  getClientIp,
  parseUserAgent,
  fetchGeo,
  getOrgCn,
} from "@/app/lib/utils";

// 获取北京时间
function getBeijingTime() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const path = request.headers.get("x-path") || "";
  const ua = request.headers.get("user-agent") || "";

  // 基于北京时间计算当天0点和次日0点
  const nowBeijing = getBeijingTime();
  const today = new Date(nowBeijing);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 数据库里面存的依然是UTC格式Date对象，查询条件也要转回UTC时间
  const utcToday = new Date(today.getTime() - 8 * 60 * 60 * 1000);
  const utcTomorrow = new Date(tomorrow.getTime() - 8 * 60 * 60 * 1000);

  const existing = await prisma.visitor.findFirst({
    where: {
      ip,
      created_at: {
        gte: utcToday,
        lt: utcTomorrow,
      },
    },
  });

  if (existing) {
    // 更新访问时间，存入北京时间对应的UTC时间
    const updated = await prisma.visitor.update({
      where: { id: existing.id },
      data: {
        path,
        user_agent: ua,
        created_at: getBeijingTime(),
      },
    });
    return NextResponse.json({ code: 0, message: "updated", data: updated });
  }

  const parsed = parseUserAgent(ua);
  const geo = await fetchGeo(ip);

  const visitor = await prisma.visitor.create({
    data: {
      ip,
      path,
      user_agent: ua,
      city: (geo.city as string) || "",
      region: (geo.region as string) || "",
      country: (geo.country as string) || "",
      district: (geo.district as string) || "",
      org: getOrgCn((geo.org as string) || "", (geo.asn as string) || ""),
      asn: (geo.asn as string) || "",
      is_mobile: (geo.is_mobile as boolean) || false,
      is_proxy: (geo.is_proxy as boolean) || false,
      is_hosting: (geo.is_hosting as boolean) || false,
      browser: parsed.browser,
      os: parsed.os,
      device_type: parsed.device_type,
      // 创建访客记录的时间
      created_at: getBeijingTime(),
    },
  });

  return NextResponse.json({ code: 0, message: "success", data: visitor });
}
