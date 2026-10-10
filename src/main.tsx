import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import "./styles.css";

const appElement = document.getElementById("app");

if (!appElement) {
  throw new Error("Elemento raiz da aplicação não encontrado.");
}

createRoot(appElement).render(
  <StrictMode>
    <RouterProvider router={getRouter()} />
  </StrictMode>,
);
