export type AppView = "guest" | "admin";

interface ViewLocation {
  hostname: string;
  port: string;
  search: string;
}

export function getInitialViewFromLocation(location: ViewLocation): AppView {
  const requestedView = new URLSearchParams(location.search).get("view");
  if (requestedView === "admin" || requestedView === "guest") return requestedView;

  const isLocalAdminPort = (
    (location.hostname === "127.0.0.1" || location.hostname === "localhost")
    && location.port === "5174"
  );

  return isLocalAdminPort ? "admin" : "guest";
}
