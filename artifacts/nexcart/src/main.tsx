import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AiButton } from "./components/nexcart/AiButton";
import { router } from "./router";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <RouterProvider router={router} />
        <AiButton />
        <Toaster position="top-right" richColors closeButton />
      </CurrencyProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

