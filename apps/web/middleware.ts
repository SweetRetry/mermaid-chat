import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const AUTH_COOKIE_NAME = "site-auth"

export function middleware(request: NextRequest) {
  const password = process.env.SITE_PASSWORD

  // 如果没有设置密码，跳过验证
  if (!password) {
    return NextResponse.next()
  }

  const isAuthed = request.cookies.get(AUTH_COOKIE_NAME)?.value === password

  // 登录页面和登录 API 放行
  if (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/api/auth"
  ) {
    // 已登录用户访问登录页，重定向到首页
    if (isAuthed && request.nextUrl.pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // 未认证则跳转登录页
  if (!isAuthed) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，排除：
     * - _next/static (静态资源)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
