import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Enums, RenderingEngine, type StackViewport } from '@cornerstonejs/core'
import { Link, useParams } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react'
import { createDicomImageIds, initializeCornerstone } from '@/lib/cornerstone'
import { formatBytes, getDicomFile } from '@/lib/dicom-files'
import { Button, buttonVariants } from '@/components/ui/button'

type ViewerStatus = 'loading' | 'ready' | 'error'

function ViewerPage() {
  const { id } = useParams({ strict: false })
  const dicomFile = getDicomFile(id ?? '')
  const reactId = useId().replace(/:/g, '')
  const elementRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<StackViewport | null>(null)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const [status, setStatus] = useState<ViewerStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentFrame, setCurrentFrame] = useState(1)

  useEffect(() => {
    if (!dicomFile || !elementRef.current) return

    const element = elementRef.current
    const file = dicomFile
    const renderingEngineId = `dicom-rendering-engine-${reactId}`
    const viewportId = `dicom-stack-viewport-${reactId}`
    let renderingEngine: RenderingEngine | undefined
    let resizeObserver: ResizeObserver | undefined
    let cancelled = false

    setStatus('loading')
    setErrorMessage('')
    setCurrentFrame(1)

    const handleNewImage = (event: Event) => {
      const detail = (event as CustomEvent<{ imageIdIndex: number }>).detail
      setCurrentFrame(detail.imageIdIndex + 1)
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()

      const viewport = viewportRef.current
      if (!viewport || file.frames === 1) return

      const currentIndex = viewport.getCurrentImageIdIndex()
      const nextIndex = Math.min(
        Math.max(currentIndex + (event.deltaY > 0 ? 1 : -1), 0),
        file.frames - 1
      )

      if (nextIndex !== currentIndex) {
        void viewport.setImageIdIndex(nextIndex)
      }
    }

    async function renderDicom() {
      try {
        await initializeCornerstone()
        if (cancelled) return

        renderingEngine = new RenderingEngine(renderingEngineId)
        renderingEngineRef.current = renderingEngine
        renderingEngine.enableElement({
          viewportId,
          type: Enums.ViewportType.STACK,
          element,
          defaultOptions: {
            background: [0.015, 0.02, 0.03],
          },
        })

        const viewport = renderingEngine.getViewport(
          viewportId
        ) as StackViewport
        viewportRef.current = viewport

        element.addEventListener(Enums.Events.STACK_NEW_IMAGE, handleNewImage)
        element.addEventListener('wheel', handleWheel, { passive: false })

        const imageIds = createDicomImageIds(file.fileName, file.frames)
        await viewport.setStack(imageIds, 0)
        if (cancelled) return

        viewport.render()
        setStatus('ready')

        resizeObserver = new ResizeObserver(() => {
          renderingEngine?.resize(true, false)
        })
        resizeObserver.observe(element)
      } catch (error) {
        if (cancelled) return

        setStatus('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The DICOM image could not be rendered.'
        )
      }
    }

    void renderDicom()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      element.removeEventListener(Enums.Events.STACK_NEW_IMAGE, handleNewImage)
      element.removeEventListener('wheel', handleWheel)
      viewportRef.current = null
      renderingEngineRef.current = null
      if (renderingEngine && !renderingEngine.hasBeenDestroyed) {
        renderingEngine.destroy()
      }
    }
  }, [dicomFile, reactId])

  const showFrame = useCallback(
    (frame: number) => {
      if (!dicomFile || !viewportRef.current) return

      const nextFrame = Math.min(Math.max(frame, 1), dicomFile.frames)
      void viewportRef.current.setImageIdIndex(nextFrame - 1)
    },
    [dicomFile]
  )

  if (!dicomFile) {
    return (
      <section className='flex min-h-[60vh] flex-col items-center justify-center text-center'>
        <span className='mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
          <AlertCircle aria-hidden='true' className='size-6' />
        </span>
        <h1 className='text-2xl font-semibold'>DICOM file not found</h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          No fixture matches the requested identifier.
        </p>
        <Link to='/list' className={buttonVariants({ className: 'mt-6' })}>
          Return to file list
        </Link>
      </section>
    )
  }

  return (
    <section aria-labelledby='viewer-title'>
      <div className='mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
        <div>
          <Link
            to='/list'
            className='mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          >
            <ArrowLeft aria-hidden='true' className='size-4' />
            All DICOM files
          </Link>
          <div className='flex flex-wrap items-center gap-2'>
            <h1
              id='viewer-title'
              className='text-2xl font-semibold tracking-tight sm:text-3xl'
            >
              {dicomFile.name}
            </h1>
            <span className='rounded-md border bg-muted px-2 py-0.5 font-mono text-xs font-semibold'>
              {dicomFile.modality}
            </span>
          </div>
          <p className='mt-2 font-mono text-xs break-all text-muted-foreground'>
            {dicomFile.fileName}
          </p>
        </div>

        <div className='grid grid-cols-3 divide-x rounded-lg border bg-card shadow-xs'>
          <ViewerStat
            label='Frames'
            value={dicomFile.frames.toLocaleString()}
          />
          <ViewerStat
            label='Matrix'
            value={`${dicomFile.rows} × ${dicomFile.columns}`}
          />
          <ViewerStat label='Size' value={formatBytes(dicomFile.bytes)} />
        </div>
      </div>

      <div className='grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]'>
        <div className='overflow-hidden rounded-xl border bg-zinc-950 shadow-sm'>
          <div className='flex min-h-12 items-center justify-between border-b border-white/10 px-3 text-zinc-300 sm:px-4'>
            <span className='text-xs font-medium tracking-wider uppercase'>
              Stack viewport
            </span>
            <span className='font-mono text-xs tabular-nums'>
              Frame {currentFrame.toLocaleString()} /{' '}
              {dicomFile.frames.toLocaleString()}
            </span>
          </div>

          <div className='relative'>
            <div
              ref={elementRef}
              aria-label={`DICOM viewport showing ${dicomFile.name}`}
              className='aspect-square max-h-[720px] min-h-[360px] w-full touch-none outline-none sm:min-h-[520px]'
              onContextMenu={(event) => event.preventDefault()}
             />

            {status === 'loading' && (
              <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-zinc-300'>
                <LoaderCircle
                  aria-hidden='true'
                  className='mb-3 size-6 animate-spin'
                />
                <p className='text-sm font-medium'>Loading DICOM frames</p>
                <p className='mt-1 text-xs text-zinc-500'>
                  Initializing Cornerstone and decoding pixel data…
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-300'>
                <AlertCircle
                  aria-hidden='true'
                  className='mb-3 size-7 text-red-400'
                />
                <p className='text-sm font-medium'>
                  Unable to render this file
                </p>
                <p className='mt-2 max-w-md text-xs leading-5 text-zinc-500'>
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          <div className='flex min-h-16 items-center gap-2 border-t border-white/10 px-3 sm:px-4'>
            <Button
              variant='outline'
              size='icon-sm'
              aria-label='Previous frame'
              disabled={status !== 'ready' || currentFrame <= 1}
              onClick={() => showFrame(currentFrame - 1)}
              className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-white'
            >
              <ChevronLeft aria-hidden='true' />
            </Button>
            <input
              aria-label='Current DICOM frame'
              type='range'
              min={1}
              max={dicomFile.frames}
              step={1}
              value={currentFrame}
              disabled={status !== 'ready' || dicomFile.frames === 1}
              onChange={(event) => showFrame(Number(event.target.value))}
              className='h-1.5 min-w-0 flex-1 cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40'
            />
            <Button
              variant='outline'
              size='icon-sm'
              aria-label='Next frame'
              disabled={status !== 'ready' || currentFrame >= dicomFile.frames}
              onClick={() => showFrame(currentFrame + 1)}
              className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-white'
            >
              <ChevronRight aria-hidden='true' />
            </Button>
            <div className='mx-1 h-5 w-px bg-white/10' />
            <Button
              variant='outline'
              size='icon-sm'
              aria-label='Reset viewport'
              disabled={status !== 'ready'}
              onClick={() => {
                viewportRef.current?.resetCamera()
                viewportRef.current?.render()
              }}
              className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-white'
            >
              <RotateCcw aria-hidden='true' />
            </Button>
          </div>
        </div>

        <aside className='self-start overflow-hidden rounded-xl border bg-card shadow-xs'>
          <div className='border-b px-4 py-3'>
            <h2 className='text-sm font-semibold'>File attributes</h2>
          </div>
          <dl className='divide-y'>
            <Attribute label='Modality' value={dicomFile.modality} />
            <Attribute
              label='Number of frames'
              value={dicomFile.frames.toLocaleString()}
            />
            <Attribute
              label='Rows × columns'
              value={`${dicomFile.rows} × ${dicomFile.columns}`}
            />
            <Attribute
              label='Transfer syntax'
              value={dicomFile.transferSyntax}
              detail={dicomFile.transferSyntaxUid}
            />
            <Attribute label='File size' value={formatBytes(dicomFile.bytes)} />
            <Attribute label='Source' value={dicomFile.repository} />
            <Attribute label='License' value={dicomFile.license} />
          </dl>
          <p className='border-t bg-muted/35 px-4 py-3 text-xs leading-5 text-muted-foreground'>
            Scroll over the viewport or use the controls below it to navigate
            multi-frame files.
          </p>
        </aside>
      </div>
    </section>
  )
}

function ViewerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-24 px-4 py-2.5'>
      <span className='block text-[11px] tracking-wide text-muted-foreground uppercase'>
        {label}
      </span>
      <span className='mt-0.5 block font-mono text-sm font-semibold tabular-nums'>
        {value}
      </span>
    </div>
  )
}

function Attribute({
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

export { ViewerPage }
