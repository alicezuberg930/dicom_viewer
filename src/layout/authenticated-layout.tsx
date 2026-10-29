import { AppRightSidebar } from '@/layout/app-right-sidebar'
import { AppSidebar } from '@/layout/app-sidebar'
import { LayoutProvider } from '@/providers/layout-provider'
import { Outlet } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { SkipToMain } from '@/components/skip-to-main'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <LayoutProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <SkipToMain />
        <AppSidebar />
        <SidebarInset
          className={cn('@container/content', 'has-data-[layout=fixed]:h-svh')}
        >
          <div className='flex min-h-0 flex-1'>
            <div className='flex min-w-0 flex-1 flex-col'>
              {children ?? <Outlet />}
            </div>
            <AppRightSidebar />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </LayoutProvider>
  )
}
