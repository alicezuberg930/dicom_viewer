import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLayout } from '@/providers/layout-provider'
import { Enums, RenderingEngine, type StackViewport } from '@cornerstonejs/core'
import { Link, useParams } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { createDicomImageIds, initializeCornerstone } from '@/lib/cornerstone'
import { formatBytes, getDicomFile } from '@/lib/dicom-files'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ViewerStatus = 'loading' | 'ready' | 'error'
type FrameRate = (typeof FRAME_RATES)[number]

const FRAME_RATES = ['15', '30', '45', '60'] as const

function ViewerPage() {
  const { id } = useParams({ strict: false })
  const { viewportLayout } = useLayout()
  const dicomFile = getDicomFile(id ?? '')
  const reactId = useId().replace(/:/g, '')
  const elementRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<StackViewport | null>(null)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const [status, setStatus] = useState<ViewerStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentFrame, setCurrentFrame] = useState(1)
  const [frameRate, setFrameRate] = useState<FrameRate>('30')
  const [isPlaying, setIsPlaying] = useState(false)
  const viewportCount = viewportLayout.rows * viewportLayout.columns

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
    setIsPlaying(false)

    const handleNewImage = (event: Event) => {
      const detail = (event as CustomEvent<{ imageIdIndex: number }>).detail
      setCurrentFrame(detail.imageIdIndex + 1)

      if (detail.imageIdIndex >= file.frames - 1) {
        setIsPlaying(false)
      }
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

  useEffect(() => {
    if (
      !isPlaying ||
      status !== 'ready' ||
      !dicomFile ||
      currentFrame >= dicomFile.frames
    ) {
      return
    }

    const timeoutId = window.setTimeout(
      () => {
        const viewport = viewportRef.current
        if (!viewport) {
          setIsPlaying(false)
          return
        }

        const nextIndex = viewport.getCurrentImageIdIndex() + 1
        if (nextIndex >= dicomFile.frames) {
          setIsPlaying(false)
          return
        }

        void viewport.setImageIdIndex(nextIndex).catch((error: unknown) => {
          setIsPlaying(false)
          setStatus('error')
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'The next DICOM frame could not be rendered.'
          )
        })
      },
      1000 / Number(frameRate)
    )

    return () => window.clearTimeout(timeoutId)
  }, [currentFrame, dicomFile, frameRate, isPlaying, status])

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
      </div>

      <div className=''>
        <div className='overflow-hidden rounded-xl border bg-zinc-950 shadow-sm'>
          <div className='flex min-h-12 items-center justify-between border-b border-white/10 px-3 text-zinc-300 sm:px-4'>
            <span className='text-xs font-medium tracking-wider uppercase'>
              Stack viewport · {viewportLayout.rows} × {viewportLayout.columns}
            </span>
            <span className='font-mono text-xs tabular-nums'>
              Frame {currentFrame.toLocaleString()} /{' '}
              {dicomFile.frames.toLocaleString()}
            </span>
          </div>

          <div
            className='grid aspect-square max-h-180 min-h-90 w-full gap-px bg-white/10 sm:min-h-[520px]'
            style={{
              gridTemplateColumns: `repeat(${viewportLayout.columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${viewportLayout.rows}, minmax(0, 1fr))`,
            }}
          >
            <div className='relative min-h-0 min-w-0 bg-zinc-950'>
              <div
                ref={elementRef}
                aria-label={`DICOM viewport showing ${dicomFile.name}`}
                className='size-full touch-none outline-none'
                onContextMenu={(event) => event.preventDefault()}
              />

              {status === 'loading' && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-300'>
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

            {Array.from({ length: viewportCount - 1 }, (_, index) => (
              <div
                key={index}
                aria-label={`Empty viewport ${index + 2}`}
                className='flex min-h-0 min-w-0 flex-col items-center justify-center bg-zinc-950 text-zinc-600'
              >
                <LayoutGrid aria-hidden='true' className='size-5' />
                <span className='mt-1.5 text-[10px] font-medium tracking-wide uppercase'>
                  Viewport {index + 2}
                </span>
              </div>
            ))}
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
            <Select
              value={frameRate}
              onValueChange={(value) => {
                if (FRAME_RATES.includes(value as FrameRate)) {
                  setFrameRate(value as FrameRate)
                }
              }}
            >
              <SelectTrigger
                size='sm'
                aria-label='Playback frame rate'
                disabled={status !== 'ready' || dicomFile.frames === 1}
                className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 focus-visible:border-white/30 focus-visible:ring-white/20 dark:bg-white/5 dark:hover:bg-white/10'
              >
                <SelectValue>{frameRate} FPS</SelectValue>
              </SelectTrigger>
              <SelectContent side='top' align='end' className='min-w-23'>
                {FRAME_RATES.map((rate) => (
                  <SelectItem key={rate} value={rate}>
                    {rate} FPS
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className='mx-1 h-5 w-px bg-white/10' />
            <Button
              variant='outline'
              size='icon-sm'
              aria-label={isPlaying ? 'Pause playback' : 'Play frames'}
              title={isPlaying ? 'Pause playback' : 'Play frames'}
              disabled={status !== 'ready' || dicomFile.frames === 1}
              onClick={() => {
                if (isPlaying) {
                  setIsPlaying(false)
                  return
                }

                if (currentFrame >= dicomFile.frames) {
                  showFrame(1)
                }
                setIsPlaying(true)
              }}
              className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-white'
            >
              {isPlaying ? (
                <Pause aria-hidden='true' />
              ) : (
                <Play aria-hidden='true' />
              )}
            </Button>
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
