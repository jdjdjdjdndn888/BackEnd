import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const AvatarRoot = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
    {...props}
  />
));
AvatarRoot.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-[#252839] text-white text-xs font-bold", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

const Avatar = ({ imgUrl, level, className, onClick, ...rest }) => (
  <div
    className={cn("relative inline-flex shrink-0", className)}
    onClick={onClick}
    {...rest}
  >
    <AvatarRoot className="h-full w-full">
      <AvatarImage src={imgUrl} alt="avatar" />
      <AvatarFallback>?</AvatarFallback>
    </AvatarRoot>
    {level !== undefined && (
      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#8B5CF6] text-[9px] font-bold text-white ring-2 ring-[#0f1420]">
        {level}
      </span>
    )}
  </div>
);

export { Avatar, AvatarRoot, AvatarImage, AvatarFallback };
