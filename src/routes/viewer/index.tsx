import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useLayout } from '@/providers/layout-provider'
import { Enums, RenderingEngine, type StackViewport } from '@cornerstonejs/core'
import { Link, useParams } from '@tanstack/react-router'
import { AlertCircle, LoaderCircle } from 'lucide-react'
import { createDicomImageIds, initializeCornerstone } from '@/lib/cornerstone'
import { getDicomFile } from '@/lib/dicom-files'
import { buttonVariants } from '@/components/ui/button'

type ViewerStatus = 'loading' | 'ready' | 'error'
type FrameRate = (typeof FRAME_RATES)[number]

const FRAME_RATES = ['15', '30', '45', '60'] as const

function ViewerPage() {
  const { id } = useParams({ strict: false })
  const { viewportLayout } = useLayout()
  const dicomFile = getDicomFile(id ?? '')
  const reactId = useId().replace(/:/g, '')
  const elementRefs = useRef<Array<HTMLDivElement | null>>([])
  const viewportRefs = useRef<StackViewport[]>([])
  const [status, setStatus] = useState<ViewerStatus>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [currentFrame, setCurrentFrame] = useState(1)
  const [frameRate, _setFrameRate] = useState<FrameRate>('30')
  const [isPlaying, setIsPlaying] = useState(false)
  const viewportCount = viewportLayout.rows * viewportLayout.columns
  const frameProgress = dicomFile
    ? Math.min((currentFrame / dicomFile.frames) * 100, 100)
    : 0

  const setAllViewportFrames = useCallback((imageIdIndex: number) => {
    return Promise.all(
      viewportRefs.current.map((viewport) =>
        viewport.setImageIdIndex(imageIdIndex)
      )
    ).then(() => undefined)
  }, [])

  useEffect(() => {
    if (!dicomFile) return

    const elements = elementRefs.current.slice(0, viewportCount)
    if (
      elements.length !== viewportCount ||
      elements.some((element) => element === null)
    ) {
      return
    }

    const viewportElements = elements as HTMLDivElement[]
    const file = dicomFile
    const renderingEngineId = `dicom-rendering-engine-${reactId}`
    let renderingEngine: RenderingEngine | undefined
    let resizeObserver: ResizeObserver | undefined
    const wheelHandlers: Array<(event: WheelEvent) => void> = []
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

    async function renderDicom() {
      try {
        await initializeCornerstone()
        if (cancelled) return

        renderingEngine = new RenderingEngine(renderingEngineId)
        const viewports = viewportElements.map((element, index) => {
          const viewportId = `dicom-stack-viewport-${reactId}-${index}`

          renderingEngine?.enableElement({
            viewportId,
            type: Enums.ViewportType.STACK,
            element,
            defaultOptions: {
              background: [0.015, 0.02, 0.03],
            },
          })

          return renderingEngine?.getViewport(viewportId) as StackViewport
        })
        viewportRefs.current = viewports

        viewportElements[0].addEventListener(
          Enums.Events.STACK_NEW_IMAGE,
          handleNewImage
        )
        viewportElements.forEach((element, index) => {
          const handleWheel = (event: WheelEvent) => {
            event.preventDefault()

            const viewport = viewportRefs.current[index]
            if (!viewport || file.frames === 1) return

            const currentIndex = viewport.getCurrentImageIdIndex()
            const nextIndex = Math.min(
              Math.max(currentIndex + (event.deltaY > 0 ? 1 : -1), 0),
              file.frames - 1
            )

            if (nextIndex !== currentIndex) {
              void setAllViewportFrames(nextIndex)
            }
          }

          wheelHandlers[index] = handleWheel
          element.addEventListener('wheel', handleWheel, { passive: false })
        })

        const imageIds = createDicomImageIds(file.fileName, file.frames)
        await Promise.all(
          viewports.map((viewport) => viewport.setStack(imageIds, 0))
        )
        if (cancelled) return

        viewports.forEach((viewport) => viewport.render())
        setStatus('ready')

        resizeObserver = new ResizeObserver(() => {
          renderingEngine?.resize(true, false)
        })
        viewportElements.forEach((element) => resizeObserver?.observe(element))
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
      viewportElements[0].removeEventListener(
        Enums.Events.STACK_NEW_IMAGE,
        handleNewImage
      )
      viewportElements.forEach((element, index) => {
        const handleWheel = wheelHandlers[index]
        if (handleWheel) element.removeEventListener('wheel', handleWheel)
      })
      viewportRefs.current = []
      if (renderingEngine && !renderingEngine.hasBeenDestroyed) {
        renderingEngine.destroy()
      }
    }
  }, [dicomFile, reactId, setAllViewportFrames, viewportCount])

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
        const viewport = viewportRefs.current[0]
        if (!viewport) {
          setIsPlaying(false)
          return
        }

        const nextIndex = viewport.getCurrentImageIdIndex() + 1
        if (nextIndex >= dicomFile.frames) {
          setIsPlaying(false)
          return
        }

        void setAllViewportFrames(nextIndex).catch((error: unknown) => {
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
  }, [
    currentFrame,
    dicomFile,
    frameRate,
    isPlaying,
    setAllViewportFrames,
    status,
  ])

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
    <section aria-labelledby='viewer-title' className='h-full'>
      <div className='h-full bg-zinc-800'>
        <div
          className='z grid aspect-square h-full max-h-full w-full gap-px bg-white/10'
          style={{
            gridTemplateColumns: `repeat(${viewportLayout.columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${viewportLayout.rows}, minmax(0, 1fr))`,
          }}
        >
          {Array.from({ length: viewportCount }, (_, index) => (
            <div key={index} className='relative min-h-0 min-w-0 bg-zinc-950'>
              <div
                ref={(element) => {
                  elementRefs.current[index] = element
                }}
                aria-label={`DICOM viewport ${index + 1} showing ${dicomFile.name}`}
                className='size-full touch-none outline-none'
                onContextMenu={(event) => event.preventDefault()}
              />

              {status === 'loading' && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-300'>
                  <LoaderCircle
                    aria-hidden='true'
                    className='mb-3 size-6 animate-spin'
                  />
                  <p className='text-xs font-medium'>Loading viewport</p>
                </div>
              )}

              {status === 'error' && (
                <div className='absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-300'>
                  <AlertCircle
                    aria-hidden='true'
                    className='mb-2 size-6 text-red-400'
                  />
                  <p className='text-xs font-medium'>Unable to render</p>
                  {index === 0 && (
                    <p className='mt-2 max-w-md text-xs leading-5 text-zinc-500'>
                      {errorMessage}
                    </p>
                  )}
                </div>
              )}

              {status === 'ready' && (
                <div
                  role='progressbar'
                  aria-label={`Viewport ${index + 1} frame progress`}
                  aria-valuemin={1}
                  aria-valuemax={dicomFile.frames}
                  aria-valuenow={currentFrame}
                  className='pointer-events-none absolute right-1 bottom-1 left-1 h-1.5 overflow-hidden rounded-full bg-black/65 ring-1 ring-white/20'
                >
                  <span
                    className='absolute inset-y-0 left-0 rounded-full bg-white transition-[width] duration-150'
                    style={{ width: `${frameProgress}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* <div className='flex min-h-16 items-center gap-2 border-t border-white/10 px-3 sm:px-4'>
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
              viewportRefs.current.forEach((viewport) => {
                viewport.resetCamera()
                viewport.render()
              })
            }}
            className='border-white/15 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-white'
          >
            <RotateCcw aria-hidden='true' />
          </Button>
        </div> */}
      </div>
    </section>
  )
}

export { ViewerPage }
