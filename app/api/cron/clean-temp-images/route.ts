import { NextResponse } from "next/server";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { deleteFile } from "@/app/lib/r2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
    const R2_ENDPOINT = process.env.R2_ENDPOINT;
    const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
    const R2_SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;

    if (!R2_BUCKET_NAME || !R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
      return NextResponse.json({ success: false, error: "R2环境变量配置不全" }, { status: 500 });
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY,
        secretAccessKey: R2_SECRET_KEY,
      },
    });

    const expireMs = 7 * 24 * 60 * 60 * 1000;
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

    let successCount = 0;
    for (const key of deleteList) {
      try {
        await deleteFile(key);
        successCount++;
      } catch (err) {
        console.error("删除文件失败：", key, err);
      }
    }

    return NextResponse.json({
      success: true,
      totalNeedDelete: deleteList.length,
      successDeleted: successCount
    });
  } catch (err) {
    console.error("定时清理接口错误：", err);
    return NextResponse.json({ success: false, error: "服务器执行异常" }, { status: 500 });
  }
}
