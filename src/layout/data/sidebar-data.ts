import { Images, ScanLine } from 'lucide-react'
import { DICOM_FILES } from '@/lib/dicom-files'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'Workspace',
      items: [
        {
          title: 'DICOM files',
          url: '/list',
          icon: Images,
          badge: String(DICOM_FILES.length),
        },
      ],
    },
    {
      title: 'Viewer samples',
      items: [
        {
          title: 'Open viewer',
          icon: ScanLine,
          items: [
            { title: 'Small CT', url: '/viewer/frames-0001-ct-small' },
            { title: 'Enhanced MR', url: '/viewer/frames-0010-enhanced-mr' },
            {
              title: 'Segmentation',
              url: '/viewer/frames-0020-slide-microscopy-segmentation',
            },
            {
              title: 'Color ultrasound',
              url: '/viewer/frames-0120-color-ultrasound',
            },
          ],
        },
      ],
    },
  ],
}
