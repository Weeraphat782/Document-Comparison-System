"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileSearch, Settings, LogOut, User, Folder } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut, isLoading } = useAuth()

  // Hide navigation on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/reset-password') {
    return null
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <FileSearch className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DocAnalysis</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link href="/">
                  <Button
                    variant={pathname === "/" ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <FileSearch className="h-4 w-4" />
                    Compare
                  </Button>
                </Link>
                <Link href="/rules">
                  <Button
                    variant={pathname === "/rules" || pathname.startsWith("/rules/") ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Rules
                  </Button>
                </Link>
                <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {user.email}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut()}
                    disabled={isLoading}
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button size="sm">
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
