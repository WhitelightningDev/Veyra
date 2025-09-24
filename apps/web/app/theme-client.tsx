"use client";

import React from "react";

// Minimal color scheme hook for web without extra deps
function useColorScheme(): "light" | "dark" {
  const getScheme = () =>
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  const [scheme, setScheme] = React.useState<"light" | "dark">(() => getScheme());

  React.useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setScheme(media.matches ? "dark" : "light");
    if (media.addEventListener) media.addEventListener("change", onChange);
    else media.addListener(onChange);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", onChange);
      else media.removeListener?.(onChange);
    };
  }, []);

  return scheme;
}

export default function ThemeClient({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();

  // Optionally expose theme to CSS via data attribute and class
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = scheme;
    document.documentElement.classList.toggle("dark", scheme === "dark");
    document.documentElement.classList.toggle("light", scheme !== "dark");
  }, [scheme]);

  return <>{children}</>;
}

