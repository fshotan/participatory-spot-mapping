import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/user";
import { ABOUT_KEY, getAboutContent, setContent } from "@/lib/content";

export async function GET() {
  const content = await getAboutContent();
  return NextResponse.json({ content });
}

const schema = z.object({
  content: z.string().max(20000),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "入力が不正です" },
      { status: 400 },
    );
  }

  await setContent(ABOUT_KEY, parsed.data.content);
  return NextResponse.json({ content: parsed.data.content });
}
