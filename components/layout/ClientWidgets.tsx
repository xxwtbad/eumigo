"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
// 导入站点配置读取工具，用于读取数据库中的配置项
import { useConfigValue } from "@/components/providers/SiteConfigProvider";

const FloatingPlayer = dynamic(() => import("@/components/music/FloatingPlayer"), { ssr: false });
const Live2D = dynamic(() => import("@/components/widgets/Live2D"), { ssr: false });
const Toolbox = dynamic(() => import("@/components/widgets/Toolbox"), { ssr: false });
const GamesPanel = dynamic(() => import("@/components/widgets/GamesPanel"), { ssr: false });

export default function ClientWidgets() {
  const pathname = usePathname();
   // 从站点配置读取 Live2D 看板娘开关状态
  // "true" = 开启显示，"false" = 关闭隐藏
  // 第二个参数是默认值，数据库没配置时用这个
  const live2dEnabled = useConfigValue("live2d_enabled", "true");
  if (pathname.startsWith("/garden")) return null;

  return (
    <>
      <FloatingPlayer />
     {/* Live2D 看板娘 - 根据后台配置决定是否显示 */}
      {live2dEnabled === "true" && <Live2D />}
      <Toolbox />
      <GamesPanel />
    </>
  );
}
