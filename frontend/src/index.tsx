import React from "react";
import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { AppRouter } from "@/router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SessionExpiredModal } from "@/components/SessionExpiredModal";
import { useAuthStore } from "@/stores/authStore";
import "./index.css";

function Boot() {
  const hydrate = useAuthStore((s) => s.hydrate);
  React.useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <ErrorBoundary>
      <AppRouter />
      <SessionExpiredModal />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "12px",
            fontSize: "13px",
            boxShadow: "0 10px 40px rgba(15,23,42,0.12)"
          }
        }}
      />
    </ErrorBoundary>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boot />
  </React.StrictMode>
);
