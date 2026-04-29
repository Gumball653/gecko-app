import React from "react";

function getVariantClasses(variant) {
  if (variant === "outline") {
    return "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50";
  }
  if (variant === "ghost") {
    return "border border-transparent bg-transparent text-slate-700 hover:bg-slate-100";
  }
  return "border border-slate-900 bg-slate-900 text-white hover:bg-slate-800";
}

function getSizeClasses(size) {
  if (size === "sm") return "px-3 py-2 text-sm";
  return "px-4 py-2 text-sm";
}

export function Button({
  children,
  className = "",
  variant = "default",
  size = "default",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        getVariantClasses(variant),
        getSizeClasses(size),
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
