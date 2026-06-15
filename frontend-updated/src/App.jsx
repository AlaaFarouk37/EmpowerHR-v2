import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ProtectedRoute, RoleRoute } from "./routes/Guards";
import { AppLayout } from "./routes/AppLayout";
import { NeuralErrorBoundary, ToastContainer } from "./components/shared";
import { PUBLIC_ROUTES, PROTECTED_ROUTES } from "./routes/registry";
import "./index.css";
import "./auth.css";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <ToastContainer />
          <Routes>
            {/* --- Public routes (no layout) --- */}
            {PUBLIC_ROUTES.map((route) => (
              <Route 
                key={route.path} 
                path={route.path} 
                element={route.element} 
              />
            ))}

            {/* --- Protected routes (with layout) --- */}
            <Route element={<ProtectedRoute />}>
              <Route element={
                <NeuralErrorBoundary>
                  <AppLayout />
                </NeuralErrorBoundary>
              }>
                {PROTECTED_ROUTES.map((route) => (
                  <Route
                    key={route.path}
                    element={
                      <NeuralErrorBoundary>
                        <RoleRoute 
                          allowed={route.roles} 
                          requiredPermission={route.permission} 
                        />
                      </NeuralErrorBoundary>
                    }
                  >
                    <Route path={route.path} element={route.element} />
                  </Route>
                ))}
              </Route>
            </Route>

            {/* Module Redirects */}
            <Route path="/hr" element={<Navigate to="/hr/attendance" replace />} />
            <Route path="/admin" element={<Navigate to="/admin/organization" replace />} />
            <Route path="/employee" element={<Navigate to="/employee/dashboard" replace />} />
            <Route path="/leader" element={<Navigate to="/leader/dashboard" replace />} />
            <Route path="/candidate" element={<Navigate to="/candidate/dashboard" replace />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
