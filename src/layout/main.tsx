import { cn } from '@/lib/utils'

type MainProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  fluid?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Main({ fixed, className, fluid, ...props }: MainProps) {
  return (
    <main
      data-layout={fixed ? 'fixed' : 'auto'}
      className={cn(
        // If layout is fixed, keep the header in place and scroll the content
        fixed && 'flex min-h-0 grow flex-col overflow-x-hidden overflow-y-auto',

        // If layout is not fluid, set the max-width
        !fluid && 'mx-auto w-full',
        className
      )}
      {...props}
    />
  )
}
