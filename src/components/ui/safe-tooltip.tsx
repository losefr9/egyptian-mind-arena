import * as React from "react"
import { cn } from "@/lib/utils"

// Safe Tooltip replacement that doesn't use Radix UI
// This avoids the React context issues with TooltipProvider

interface TooltipProps {
  children: React.ReactNode
}

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
  sideOffset?: number
}

const SafeTooltipProvider = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const SafeTooltip = ({ children }: TooltipProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { isOpen })
        }
        return child
      })}
    </div>
  )
}

const SafeTooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ asChild, children, className, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        className: cn(className, children.props.className),
        ...props
      })
    }
    
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  }
)
SafeTooltipTrigger.displayName = "SafeTooltipTrigger"

const SafeTooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps & { isOpen?: boolean }>(
  ({ children, className, side = "top", sideOffset = 4, isOpen, ...props }, ref) => {
    if (!isOpen) return null
    
    const sideStyles = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
      left: "right-full top-1/2 -translate-y-1/2 mr-2",
      right: "left-full top-1/2 -translate-y-1/2 ml-2"
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          sideStyles[side],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SafeTooltipContent.displayName = "SafeTooltipContent"

export { 
  SafeTooltip as Tooltip, 
  SafeTooltipTrigger as TooltipTrigger, 
  SafeTooltipContent as TooltipContent,
  SafeTooltipProvider as TooltipProvider
}
