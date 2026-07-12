import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { deleteFile, getS3Client, getBucketName } from "@/app/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 完全复用你原本的 R2 方法，不需要任何新环境变量
    const client = getS3Client();
    const bucket = getBucketName();

    const expireMs = 7 * 24 * 60 * 60 * 1000;
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

    let successCount = 0;
    for (const key of deleteList) {
      try {
        await deleteFile(key);
        successCount++;
      } catch (err) {
        console.error("删除失败:", key);
      }
    }

    return NextResponse.json({
      success: true,
      total: deleteList.length,
      deleted: successCount,
    });
  } catch (err) {
    console.error("Cron Error:", err);
    return NextResponse.json({ success: false, error: "执行失败" }, { status: 500 });
  }
}
