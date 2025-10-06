import * as React from "react"
import { cn } from "@/lib/utils"

// Simple Tooltip implementation without Radix UI
// This avoids React context issues

interface TooltipProps {
  children: React.ReactNode
  delayDuration?: number
}

interface TooltipTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
  [key: string]: any
}

interface TooltipContentProps {
  children: React.ReactNode
  className?: string
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
  sideOffset?: number
  hidden?: boolean
}

const TooltipContext = React.createContext<{
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}>({
  isOpen: false,
  setIsOpen: () => {},
})

const TooltipProvider = ({ children }: TooltipProps) => {
  return <>{children}</>
}

const Tooltip = ({ children }: TooltipProps) => {
  const [isOpen, setIsOpen] = React.useState(false)
  
  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      <div className="relative inline-block">
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<HTMLDivElement, TooltipTriggerProps>(
  ({ asChild, children, className, ...props }, ref) => {
    const { setIsOpen } = React.useContext(TooltipContext)
    
    const handleMouseEnter = () => setIsOpen(true)
    const handleMouseLeave = () => setIsOpen(false)
    
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        ref,
      })
    }
    
    return (
      <div
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={className}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ children, className, side = "top", align = "center", sideOffset = 4, hidden = false, ...props }, ref) => {
    const { isOpen } = React.useContext(TooltipContext)
    
    if (!isOpen || hidden) return null
    
    const sideClasses = {
      top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
      bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
      left: "right-full top-1/2 -translate-y-1/2 mr-2",
      right: "left-full top-1/2 -translate-y-1/2 ml-2",
    }
    
    const alignClasses = {
      start: side === "top" || side === "bottom" ? "left-0 translate-x-0" : "top-0 translate-y-0",
      center: "",
      end: side === "top" || side === "bottom" ? "left-auto right-0 translate-x-0" : "top-auto bottom-0 translate-y-0",
    }
    
    return (
      <div
        ref={ref}
        className={cn(
          "absolute z-50 px-3 py-1.5 text-sm rounded-md",
          "bg-popover text-popover-foreground border border-border shadow-md",
          "animate-in fade-in-0 zoom-in-95",
          sideClasses[side],
          align !== "center" && alignClasses[align],
          className
        )}
        style={{ marginTop: side === "bottom" ? `${sideOffset}px` : undefined }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
