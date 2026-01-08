import { NextResponse } from "next/server"

const AUTH_COOKIE_NAME = "site-auth"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 天

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

    const response = NextResponse.json({ success: true })
    response.cookies.set(AUTH_COOKIE_NAME, password, {
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
