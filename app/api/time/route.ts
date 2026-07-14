export async function GET() {
  return Response.json({
    now: new Date(),
    tz: process.env.TZ
  });
}
