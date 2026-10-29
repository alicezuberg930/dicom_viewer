import { useState } from 'react'
import { type ViewportLayout, useLayout } from '@/providers/layout-provider'
import { LayoutGrid } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'

const COMMON_LAYOUTS = [
  { rows: 1, columns: 1 },
  { rows: 1, columns: 2 },
  { rows: 2, columns: 2 },
  { rows: 2, columns: 3 },
] as const satisfies readonly ViewportLayout[]

const CUSTOM_GRID_ROWS = 3
const CUSTOM_GRID_COLUMNS = 4

function isSameLayout(first: ViewportLayout, second: ViewportLayout) {
  return first.rows === second.rows && first.columns === second.columns
}

function formatLayout(layout: ViewportLayout) {
  return `${layout.rows} × ${layout.columns}`
}

function ViewportLayoutPicker() {
  const { viewportLayout, setViewportLayout } = useLayout()
  const [open, setOpen] = useState(false)
  const [previewLayout, setPreviewLayout] = useState<ViewportLayout | null>(
    null
  )
  const visibleLayout = previewLayout ?? viewportLayout

  const chooseLayout = (layout: ViewportLayout) => {
    setViewportLayout(layout)
    setPreviewLayout(null)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setPreviewLayout(null)
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant='outline'
            size='icon'
            aria-label={`Change viewport layout. Current layout: ${formatLayout(viewportLayout)}`}
            title='Change viewport layout'
            className='size-8'
          >
            <LayoutGrid aria-hidden='true' />
          </Button>
        }
      />
      <PopoverContent
        align='end'
        className='w-[min(31rem,calc(100vw-1rem))] overflow-hidden p-0'
      >
        <div className='flex items-start justify-between gap-4 border-b px-4 py-3.5'>
          <div>
            <PopoverTitle className='text-sm font-semibold'>
              Change layout
            </PopoverTitle>
            <PopoverDescription className='mt-0.5 text-xs'>
              Choose a viewport grid
            </PopoverDescription>
          </div>
          <span className='rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary'>
            {viewportLayout.rows * viewportLayout.columns}{' '}
            {viewportLayout.rows * viewportLayout.columns === 1
              ? 'viewport'
              : 'viewports'}
          </span>
        </div>

        <div className='grid sm:grid-cols-[minmax(0,1fr)_11.5rem]'>
          <section className='p-4' aria-labelledby='common-layouts-title'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <h3 id='common-layouts-title' className='text-sm font-semibold'>
                Common layouts
              </h3>
              <span className='rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground'>
                {formatLayout(viewportLayout)}
              </span>
            </div>

            <div
              className='grid grid-cols-4 gap-2'
              role='radiogroup'
              aria-label='Common viewport layouts'
            >
              {COMMON_LAYOUTS.map((layout) => (
                <PresetLayoutButton
                  key={`${layout.rows}-${layout.columns}`}
                  layout={layout}
                  selected={isSameLayout(layout, viewportLayout)}
                  onClick={() => chooseLayout(layout)}
                />
              ))}
            </div>

            <p className='mt-3 text-xs leading-5 text-muted-foreground'>
              Pick a preset to compare multiple series or slices quickly.
            </p>
          </section>

          <section
            className='border-t p-4 sm:border-t-0 sm:border-l'
            aria-labelledby='custom-layout-title'
          >
            <div className='mb-3 flex items-center justify-between gap-3'>
              <h3 id='custom-layout-title' className='text-sm font-semibold'>
                Custom
              </h3>
              <span className='font-mono text-xs text-primary'>
                {formatLayout(visibleLayout)}
              </span>
            </div>

            <div
              className='grid grid-cols-4 gap-1 rounded-lg border bg-muted/30 p-2'
              role='radiogroup'
              aria-label='Custom viewport layouts up to 3 by 4'
              onMouseLeave={() => setPreviewLayout(null)}
            >
              {Array.from(
                { length: CUSTOM_GRID_ROWS * CUSTOM_GRID_COLUMNS },
                (_, index) => {
                  const row = Math.floor(index / CUSTOM_GRID_COLUMNS) + 1
                  const column = (index % CUSTOM_GRID_COLUMNS) + 1
                  const layout = { rows: row, columns: column }
                  const active =
                    row <= visibleLayout.rows && column <= visibleLayout.columns

                  return (
                    <button
                      key={`${row}-${column}`}
                      type='button'
                      role='radio'
                      aria-checked={isSameLayout(layout, viewportLayout)}
                      aria-label={`Use ${formatLayout(layout)} viewport layout`}
                      className={cn(
                        'aspect-square rounded-[3px] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-popover',
                        active
                          ? 'border-primary bg-primary'
                          : 'border-border bg-muted hover:border-primary/50'
                      )}
                      onMouseEnter={() => setPreviewLayout(layout)}
                      onFocus={() => setPreviewLayout(layout)}
                      onClick={() => chooseLayout(layout)}
                    />
                  )
                }
              )}
            </div>

            <p className='mt-3 text-xs leading-4 text-muted-foreground'>
              Hover to preview, then click to apply.
            </p>
          </section>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PresetLayoutButton({
  layout,
  selected,
  onClick,
}: {
  layout: ViewportLayout
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      aria-label={`Use ${formatLayout(layout)} viewport layout`}
      onClick={onClick}
      className={cn(
        'flex min-w-0 flex-col items-center gap-2 rounded-lg border bg-background px-1.5 py-2 text-xs font-semibold transition-colors outline-none hover:border-primary/60 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        selected && 'border-primary bg-primary/10 text-primary'
      )}
    >
      <span
        className='grid h-7 w-full max-w-11 gap-0.5'
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
        }}
        aria-hidden='true'
      >
        {Array.from({ length: layout.rows * layout.columns }, (_, index) => (
          <span
            key={index}
            className={cn(
              'rounded-[2px] border',
              selected
                ? 'border-primary bg-primary/15'
                : 'border-foreground/70 bg-muted/30'
            )}
          />
        ))}
      </span>
      <span className='font-mono'>{formatLayout(layout)}</span>
    </button>
  )
}

export { ViewportLayoutPicker }
