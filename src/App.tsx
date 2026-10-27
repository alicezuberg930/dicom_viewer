import { Link, Outlet } from '@tanstack/react-router'
import { Images, ScanLine } from 'lucide-react'

function App() {
  return (
    <div className='mx-auto flex min-h-svh w-full max-w-[1280px] flex-col px-4 sm:px-6'>
      <header className='flex h-16 shrink-0 items-center justify-between border-b'>
        <Link
          to='/list'
          className='flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
        >
          <span className='flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'>
            <ScanLine aria-hidden='true' className='size-5' />
          </span>
          <span>
            <span className='block text-sm leading-none font-semibold'>
              DICOM Viewer
            </span>
            <span className='mt-1 block text-xs text-muted-foreground'>
              Imaging workbench
            </span>
          </span>
        </Link>

        <nav aria-label='Primary navigation'>
          <Link
            to='/list'
            className='flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            activeProps={{
              className:
                'flex h-9 items-center gap-2 rounded-md bg-muted px-3 text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            }}
          >
            <Images aria-hidden='true' className='size-4' />
            Studies
          </Link>
        </nav>
      </header>

      <main className='flex-1 py-8'>
        <Outlet />
      </main>

      <footer className='border-t py-5 text-xs text-muted-foreground'>
        Development fixtures only — not for diagnostic use.
      </footer>
    </div>
  )
}

export { App }
