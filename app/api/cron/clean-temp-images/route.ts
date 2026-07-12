import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getS3Client, deleteFile, getBucketName } from "@/app/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = getS3Client();
  const bucket = getBucketName();
  const expireMs = 7 * 24 * 60 * 60 * 1000; // 7天过期自动删除
  const now = Date.now();

  const listCmd = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: "temp-blog-images/",
  });

  const result = await client.send(listCmd);
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

  for (const key of deleteList) {
    await deleteFile(key).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    deletedCount: deleteList.length
  });
}
