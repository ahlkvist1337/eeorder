import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OrdersProvider } from "@/contexts/OrdersContext";
import Index from "./pages/Index";
import CreateOrder from "./pages/CreateOrder";
import OrderDetails from "./pages/OrderDetails";
import TreatmentSteps from "./pages/TreatmentSteps";
import Statistics from "./pages/Statistics";
import ProductionScreen from "./pages/ProductionScreen";
import NotFound from "./pages/NotFound";

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OrdersProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/create" element={<CreateOrder />} />
              <Route path="/order/:id" element={<OrderDetails />} />
              <Route path="/steps" element={<TreatmentSteps />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/production" element={<ProductionScreen />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </OrdersProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
