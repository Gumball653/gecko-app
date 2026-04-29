import React from "react";

export function Card({ className = "", ...props }) {
  return <div className={["bg-white", className].join(" ")} {...props} />;
}

export function CardContent({ className = "", ...props }) {
  return <div className={className} {...props} />;
}
