import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { deleteFile } from "@/app/lib/r2";

// 直接复用你 r2.ts 里写死的 R2 配置参数
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const R2_ENDPOINT = process.env.R2_ENDPOINT!;
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY!;

import { S3Client } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

// 本地创建 S3 客户端，不再依赖 r2.ts 的导出
const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
});

export async function GET() {
  const expireMs = 7 * 24 * 60 * 60 * 1000; // 7天过期
  const now = Date.now();

  const listCmd = new ListObjectsV2Command({
    Bucket: R2_BUCKET_NAME,
    Prefix: "temp-blog-images/",
  });

  const result = await s3Client.send(listCmd);
  const deleteList: string[] = [];

  if (result.Contents) {
    for (const obj of result.Contents) {
      if (!obj.Key || !obj.LastModified) continue;
      const createTime = new Date(obj.LastModified).getTime();
      if (now - createTime > expireMs) {
        deleteList.push(obj.Key);
      }
    }
  }

  // 逐个删除过期临时图片
  for (const key of deleteList) {
    await deleteFile(key).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    deletedCount: deleteList.length
  });
}
