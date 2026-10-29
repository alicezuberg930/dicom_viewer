import { Link } from '@tanstack/react-router'
import { Menu, ScanLine, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-2 py-0 hover:bg-transparent active:bg-transparent'
          render={
            <div>
              <Link
                to='/list'
                onClick={() => setOpenMobile(false)}
                className='flex min-w-0 flex-1 items-center gap-2 text-start text-sm leading-tight'
              >
                <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <ScanLine className='size-4' />
                </span>
                <span className='grid min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
                  <span className='truncate font-bold'>DICOM Viewer</span>
                  <span className='truncate text-xs'>Imaging workbench</span>
                </span>
              </Link>
              <ToggleSidebar className='group-data-[collapsible=icon]:hidden' />
            </div>
          }
        />
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}
