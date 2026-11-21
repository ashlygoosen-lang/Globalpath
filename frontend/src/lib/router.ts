import { useEffect, useState } from "react";

export type Route = { path: string; parts: string[]; query: URLSearchParams };

function read(): Route {
  const raw = location.hash.replace(/^#/, "").split("#")[0] || "/";
  const [p, q = ""] = raw.split("?");
  const path = p.startsWith("/") ? p : `/${p}`;
  return { path, parts: path.split("/").filter(Boolean), query: new URLSearchParams(q) };
}

export function useRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function navigate(to: string) {
  const target = `#${to.startsWith("/") ? to : `/${to}`}`;
  if (location.hash === target) window.scrollTo({ top: 0, behavior: "smooth" });
  else location.hash = target;
}

export const href = (to: string) => `#${to}`;
