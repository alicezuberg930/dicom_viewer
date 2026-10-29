import { Database } from 'lucide-react'
import { DICOM_FILES } from '@/lib/dicom-files'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavUser() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          tooltip={`${DICOM_FILES.length} public DICOM fixtures`}
        >
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background'>
            <Database className='size-4' />
          </span>
          <span className='grid flex-1 text-start text-sm leading-tight'>
            <span className='truncate font-semibold'>Public fixtures</span>
            <span className='truncate text-xs'>
              {DICOM_FILES.length} DICOM files
            </span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
