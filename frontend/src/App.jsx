import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import ProtectedRoute from "./components/ProtectedRoute";
import StoreShell from "./components/StoreShell";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductPage from "./pages/ProductPage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          <Route element={<StoreShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/p/:slug" element={<ProductPage />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/account/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/account/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="products" element={<AdminProducts />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </AuthProvider>
  );
}
