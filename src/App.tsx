import { AuthenticatedLayout } from '@/layout/authenticated-layout'
import { Header } from '@/layout/header'
import { Main } from '@/layout/main'
import { TopNav } from '@/layout/top-nav'
import { ViewportLayoutPicker } from '@/layout/viewport-layout-picker'
import { Outlet, useLocation } from '@tanstack/react-router'

function App() {
  const pathname = useLocation({ select: (location) => location.pathname })

  return (
    <AuthenticatedLayout>
      <Header fixed>
        <TopNav
          links={[
            {
              title: 'Studies',
              href: '/list',
              isActive: pathname === '/list',
            },
            {
              title: 'Viewer',
              href: '/viewer/frames-0001-ct-small',
              isActive: pathname.startsWith('/viewer/'),
            },
          ]}
        />
        {pathname.startsWith('/viewer/') && (
          <div className='ml-auto'>
            <ViewportLayoutPicker />
          </div>
        )}
      </Header>

      <Main fixed className='flex flex-1 flex-col'>
        <Outlet />
      </Main>
    </AuthenticatedLayout>
  )
}

export { App }
