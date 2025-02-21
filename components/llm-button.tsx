"use client"

import { ExternalLink } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LLMButtonProps {
  href: string
  type: "llms" | "llms-full"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LLMButton({ href, type, size = "md", className }: LLMButtonProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2",
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center rounded-md bg-muted hover:bg-muted/80 transition-colors z-20 relative",
            sizeClasses[size],
            className,
          )}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          {type === "llms" ? "llms.txt" : "llms-full.txt"}
          <ExternalLink className={cn("ml-1", iconSizes[size])} />
        </Link>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold">{type === "llms" ? "llms.txt Information" : "llms-full.txt Information"}</h4>
          <p className="text-sm">
            {type === "llms"
              ? "This project implements the llms.txt standard."
              : "This project provides a full llms.txt file with extended information."}
          </p>
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline">
            View {type === "llms" ? "llms.txt" : "llms-full.txt"} file
          </a>
        </div>
      </PopoverContent>
    </Popover>
  )
}

