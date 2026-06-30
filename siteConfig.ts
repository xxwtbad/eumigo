// siteConfig.ts - 全站配置中心（前端兜底配置，优先使用数据库中的站点配置）

export const siteConfig = {
  // 网站标题与博主信息
  title: "玉米狗的小站",
  url: "https://yumigou.bond/",
  authorName: "玉米狗",
  bio: "欢迎来到我的小站",

  // 头像设置
  avatarUrl: "/images/IMG_0.png",

  // 背景设置
  useGradient: false,
  themeColors: ["#a18cd1", "#fbc2eb", "#a1c4fd", "#c2e9fb"],
  bgImages: [],

  // 默认封面图
  defaultPostCover: "",

  // 照片墙预览图
  photoWallImage: "",

  // 云音乐配置（网易云音乐）
  cloudMusicPlaylistId: "18105933163",
  cloudMusicIds: [],

  // 后端 API 地址
  apiBaseUrl: "",

  // 社交链接
  social: {
    github: "",
    bilibili: "",
    email: "",
    x: "",
    youtube: "",
  },

  // 站点信息
  buildDate: "2026-06-29T00:00:00",
  icpConfig: {
    name: "",
    link: "",
  },
  moeIcpConfig: {
    name: "",
    link: "",
  },

  // 分类标题
  chatterTitle: "留言",
  chatterDescription: "生活、技术、随想的碎片记录",
  
  // ==========================================
  // 功能开关配置
  // ==========================================

  // Live2D 看板娘开关
  // "true" = 显示看板娘，"false" = 隐藏看板娘
  // 这是前端兜底配置，优先使用数据库中的站点配置
  live2dEnabled: "true",
};
