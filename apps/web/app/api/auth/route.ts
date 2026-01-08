import { AUTH_COOKIE_NAME, COOKIE_MAX_AGE, generateAuthToken } from "@/lib/auth"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const password = process.env.SITE_PASSWORD

  if (!password) {
    return NextResponse.json({ error: "未配置密码" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const inputPassword = body.password

    if (inputPassword !== password) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 })
    }

    const token = await generateAuthToken(password)
    const response = NextResponse.json({ success: true })
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete(AUTH_COOKIE_NAME)
  return response
}
