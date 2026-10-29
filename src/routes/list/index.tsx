import { useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { DICOM_FILES, formatBytes, type DicomFile } from '@/lib/dicom-files'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function ListPage() {
  const navigate = useNavigate()

  function openViewer(file: DicomFile) {
    void navigate({
      to: '/viewer/$id',
      params: { id: file.id },
    })
  }

  return (
    <section aria-labelledby='library-title'>
      <div className='mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <h1
          id='library-title'
          className='text-3xl font-semibold tracking-tight'
        >
          DICOM files
        </h1>
      </div>

      <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
        <Table>
          <TableHeader className='bg-muted/45'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='min-w-64'>File</TableHead>
              <TableHead>Modality</TableHead>
              <TableHead className='text-right'>Frames</TableHead>
              <TableHead>Matrix</TableHead>
              <TableHead className='min-w-52'>Transfer syntax</TableHead>
              <TableHead className='text-right'>Size</TableHead>
              <TableHead>License</TableHead>
              <TableHead className='w-10'>
                <span className='sr-only'>Open</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DICOM_FILES.map((file) => (
              <TableRow
                key={file.id}
                role='link'
                tabIndex={0}
                aria-label={`Open ${file.name}`}
                className='group cursor-pointer focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset'
                onClick={() => openViewer(file)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openViewer(file)
                  }
                }}
              >
                <TableCell>
                  <span className='block font-medium text-foreground'>
                    {file.name}
                  </span>
                  <span className='mt-0.5 block font-mono text-xs text-muted-foreground'>
                    {file.fileName}
                  </span>
                </TableCell>
                <TableCell>
                  <span className='inline-flex rounded-md border bg-background px-2 py-0.5 font-mono text-xs font-semibold'>
                    {file.modality}
                  </span>
                </TableCell>
                <TableCell className='text-right font-mono tabular-nums'>
                  {file.frames.toLocaleString()}
                </TableCell>
                <TableCell className='font-mono text-xs'>
                  {file.rows} × {file.columns}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {file.transferSyntax}
                </TableCell>
                <TableCell className='text-right font-mono text-xs tabular-nums'>
                  {formatBytes(file.bytes)}
                </TableCell>
                <TableCell className='text-muted-foreground'>
                  {file.license}
                </TableCell>
                <TableCell>
                  <ChevronRight
                    aria-hidden='true'
                    className='size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground'
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export { ListPage }
