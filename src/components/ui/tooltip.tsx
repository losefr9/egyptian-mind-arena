import * as React from "react"
import { cn } from "@/lib/utils"

// Safe Tooltip replacement that doesn't use Radix UI
// This avoids the React context issues with TooltipProvider

interface TooltipProps {
  children: React.ReactNode
  delayDuration?: number
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
  align?: "start" | "center" | "end"
  sideOffset?: number
  hidden?: boolean
}

const TooltipProvider = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const Tooltip = ({ children }: TooltipProps) => {
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

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
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
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps & { isOpen?: boolean }>(
  ({ children, className, side = "top", align = "center", sideOffset = 4, isOpen, hidden = false, ...props }, ref) => {
    if (!isOpen || hidden) return null
    
    const sideStyles = {
      top: "bottom-full mb-2",
      bottom: "top-full mt-2",
      left: "right-full mr-2",
      right: "left-full ml-2"
    }
    
    const alignStyles = {
      start: side === "top" || side === "bottom" ? "left-0" : "top-0",
      center: side === "top" || side === "bottom" ? "left-1/2 -translate-x-1/2" : "top-1/2 -translate-y-1/2",
      end: side === "top" || side === "bottom" ? "right-0" : "bottom-0"
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
          sideStyles[side],
          alignStyles[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
