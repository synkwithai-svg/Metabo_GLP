"use client"

import { useAuth } from "@/hooks/use-auth"
import AdminPanelLayout from "@/components/dashboard/dashboard-layout";
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
export default function DashboardLayout({
  children,
}) {
  const { user, isAuthenticated, isLoading } = useAuth()

  const router = useRouter()
  const pathname = usePathname()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace("/login")
      return
    }
    setIsCheckingAuth(false)
  }, [isAuthenticated, isLoading, router])

  if (isLoading || isCheckingAuth) {
    return <></>
  }

  return <AdminPanelLayout>{children}</AdminPanelLayout>;
}
