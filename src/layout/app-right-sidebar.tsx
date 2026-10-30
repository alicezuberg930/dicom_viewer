import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Database, ScanSearch } from 'lucide-react'
import { getCookie, setCookie } from '@/lib/cookies'
import { DICOM_FILES, formatBytes, getDicomFile } from '@/lib/dicom-files'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const RIGHT_SIDEBAR_WIDTH_COOKIE_NAME = 'right_sidebar_width'
const RIGHT_SIDEBAR_WIDTH_DEFAULT = 200
const RIGHT_SIDEBAR_WIDTH_MIN = 60
const RIGHT_SIDEBAR_WIDTH_MAX = 400

function clampRightSidebarWidth(width: number) {
  return Math.min(
    RIGHT_SIDEBAR_WIDTH_MAX,
    Math.max(RIGHT_SIDEBAR_WIDTH_MIN, width)
  )
}

function getSavedRightSidebarWidth() {
  if (typeof document === 'undefined') return RIGHT_SIDEBAR_WIDTH_DEFAULT

  const parsedWidth = Number(getCookie('RIGHT_SIDEBAR_WIDTH_COOKIE_NAME'))

  return Number.isFinite(parsedWidth)
    ? clampRightSidebarWidth(parsedWidth)
    : RIGHT_SIDEBAR_WIDTH_DEFAULT
}

export function AppRightSidebar() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const viewerId = pathname.startsWith('/viewer/')
    ? decodeURIComponent(pathname.slice('/viewer/'.length))
    : ''
  const dicomFile = getDicomFile(viewerId)
  const [width, setWidthState] = useState(getSavedRightSidebarWidth)
  const [isResizing, setIsResizing] = useState(false)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startWidth: number
  } | null>(null)
  const bodyStylesRef = useRef<{
    cursor: string
    userSelect: string
  } | null>(null)

  const setWidth = useCallback((nextWidth: number) => {
    const clampedWidth = clampRightSidebarWidth(nextWidth)
    setWidthState(clampedWidth)

    if (typeof window !== 'undefined') {
      setCookie(RIGHT_SIDEBAR_WIDTH_COOKIE_NAME, clampedWidth.toString())
    }
  }, [])

  const restoreBodyStyles = useCallback(() => {
    if (!bodyStylesRef.current) return

    document.body.style.cursor = bodyStylesRef.current.cursor
    document.body.style.userSelect = bodyStylesRef.current.userSelect
    bodyStylesRef.current = null
  }, [])

  const finishResize = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return

      dragRef.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      restoreBodyStyles()
      setIsResizing(false)
    },
    [restoreBodyStyles, setIsResizing]
  )

  useEffect(() => {
    return () => {
      restoreBodyStyles()
    }
  }, [restoreBodyStyles])

  const brainScanCount = DICOM_FILES.filter((file) =>
    file.id.startsWith('brain-')
  ).length
  const modalityCount = new Set(DICOM_FILES.map((file) => file.modality)).size
  const totalFrames = DICOM_FILES.reduce((sum, file) => sum + file.frames, 0)

  return (
    <aside
      data-slot='right-sidebar-gap'
      aria-label='DICOM inspector'
      className='relative hidden shrink-0 xl:block'
      style={{ width }}
    >
      <div
        data-slot='right-sidebar-container'
        data-resizing={isResizing}
        className={cn(
          'fixed inset-y-0 right-0 z-10 hidden h-svh xl:flex',
          !isResizing && 'transition-[width] duration-200 ease-linear'
        )}
        style={{ width }}
      >
        <div className='flex size-full min-w-0 flex-col overflow-hidden border bg-sidebar text-sidebar-foreground shadow-sm'>
          <div className='flex h-16 shrink-0 items-center gap-3 border-b px-4'>
            <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
              <ScanSearch aria-hidden='true' className='size-4' />
            </span>
            <div className='min-w-0'>
              <h2 className='truncate text-sm font-semibold'>Inspector</h2>
              <p className='truncate text-xs text-muted-foreground'>
                {dicomFile ? 'Active DICOM file' : 'Dataset overview'}
              </p>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            {dicomFile ? (
              <>
                <div className='px-4 py-4'>
                  <p className='text-sm font-semibold'>{dicomFile.name}</p>
                  <p className='mt-1 font-mono text-[11px] break-all text-muted-foreground'>
                    {dicomFile.fileName}
                  </p>
                </div>
                <Separator />
                <dl className='divide-y'>
                  <InspectorAttribute
                    label='Modality'
                    value={dicomFile.modality}
                  />
                  <InspectorAttribute
                    label='Number of frames'
                    value={dicomFile.frames.toLocaleString()}
                  />
                  <InspectorAttribute
                    label='Rows × columns'
                    value={`${dicomFile.rows} × ${dicomFile.columns}`}
                  />
                  <InspectorAttribute
                    label='Transfer syntax'
                    value={dicomFile.transferSyntax}
                    detail={dicomFile.transferSyntaxUid}
                  />
                  <InspectorAttribute
                    label='File size'
                    value={formatBytes(dicomFile.bytes)}
                  />
                  <InspectorAttribute
                    label='Source'
                    value={dicomFile.repository}
                  />
                  <InspectorAttribute
                    label='License'
                    value={dicomFile.license}
                  />
                </dl>
              </>
            ) : (
              <div className='space-y-5 p-4'>
                <div>
                  <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                    Local library
                  </p>
                  <p className='mt-2 text-sm leading-6'>
                    Browse the included DICOM samples, then open any row in the
                    viewer.
                  </p>
                </div>

                <div className='grid grid-cols-2 gap-2'>
                  <InspectorStat
                    label='Files'
                    value={DICOM_FILES.length.toLocaleString()}
                  />
                  <InspectorStat
                    label='Modalities'
                    value={modalityCount.toLocaleString()}
                  />
                  <InspectorStat
                    label='Brain scans'
                    value={brainScanCount.toLocaleString()}
                  />
                  <InspectorStat
                    label='Total frames'
                    value={totalFrames.toLocaleString()}
                  />
                </div>

                <div className='rounded-lg border bg-background/55 p-3'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <Database aria-hidden='true' className='size-4' />
                    Local fixtures
                  </div>
                  <p className='mt-2 text-xs leading-5 text-muted-foreground'>
                    Files are loaded from public/assets/dicom and rendered
                    locally with Cornerstone.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type='button'
          data-slot='right-sidebar-rail'
          aria-label='Resize right sidebar'
          title='Drag to resize the right sidebar'
          className='absolute inset-y-0 left-0 z-20 w-1 -translate-x-1/2 cursor-col-resize touch-none focus-visible:outline-none'
          onKeyDown={(event) => {
            if (event.key === 'Home') {
              event.preventDefault()
              setWidth(RIGHT_SIDEBAR_WIDTH_DEFAULT)
              return
            }

            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

            event.preventDefault()
            setWidth(width + (event.key === 'ArrowLeft' ? 8 : -8))
          }}
          onPointerDown={(event) => {
            if (event.button !== 0) return

            dragRef.current = {
              pointerId: event.pointerId,
              startX: event.clientX,
              startWidth: width,
            }
            event.currentTarget.setPointerCapture(event.pointerId)
            bodyStylesRef.current = {
              cursor: document.body.style.cursor,
              userSelect: document.body.style.userSelect,
            }
            document.body.style.cursor = 'col-resize'
            document.body.style.userSelect = 'none'
            setIsResizing(true)
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return

            setWidth(drag.startWidth - (event.clientX - drag.startX))
          }}
          onPointerUp={finishResize}
          onPointerCancel={finishResize}
        />
      </div>
    </aside>
  )
}

function InspectorAttribute({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className='px-4 py-3'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 text-sm font-medium break-words'>{value}</dd>
      {detail && (
        <dd className='mt-1 font-mono text-[11px] break-all text-muted-foreground'>
          {detail}
        </dd>
      )}
    </div>
  )
}

function InspectorStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border bg-background/55 p-3'>
      <span className='block text-[11px] text-muted-foreground'>{label}</span>
      <span className='mt-1 block font-mono text-lg font-semibold tabular-nums'>
        {value}
      </span>
    </div>
  )
}
