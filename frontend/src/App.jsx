import { useEffect, useMemo, useState } from "react";

import { CheckoutView } from "./components/CheckoutView";
import { ManagementView } from "./components/ManagementView";
import { PriceCheckerView } from "./components/PriceCheckerView";
import { isValidEan13, normalizeBarcode } from "./lib/barcode";
import { formatCurrency } from "./lib/format";
import { createProduct, deleteProduct, getProductByBarcode, getProductById, listProducts, updateProduct } from "./lib/product-api";

function normalizeProduct(product) {
  return {
    ...product,
    barcode: normalizeBarcode(product?.barcode),
    price: Number(product?.price || 0)
  };
}

function buildPayload(form) {
  return {
    barcode: normalizeBarcode(form.barcode),
    name: form.name.trim(),
    brand: form.brand.trim(),
    description: form.description.trim(),
    price: Number(form.price || 0),
    category: form.category.trim()
  };
}

export default function App() {
  const [view, setView] = useState("checkout");
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [managementMessage, setManagementMessage] = useState("");
  const [checkoutLookupBusy, setCheckoutLookupBusy] = useState(false);
  const [checkoutLookupMessage, setCheckoutLookupMessage] = useState("");
  const [checkoutSelection, setCheckoutSelection] = useState(null);
  const [priceLookupBusy, setPriceLookupBusy] = useState(false);
  const [priceLookupMessage, setPriceLookupMessage] = useState("");
  const [checkedProduct, setCheckedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");

  useEffect(() => {
    if (view === "management" && !loadingProducts) {
      refreshProducts();
    }
  }, [view]);

  async function refreshProducts() {
    setLoadingProducts(true);
    setProductsError("");

    try {
      const response = await listProducts();
      setProducts((response.data || []).map(normalizeProduct));
    } catch (error) {
      setProductsError(error.message);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function handleSaveProduct(form, editingId) {
    setSavingProduct(true);
    setManagementMessage("");

    try {
      const payload = buildPayload(form);
      if (!isValidEan13(payload.barcode)) {
        setManagementMessage("Barcode must be a valid EAN-13 code.");
        return false;
      }

      if (editingId) {
        await updateProduct(editingId, payload);
        setManagementMessage("Product updated.");
      } else {
        await createProduct(payload);
        setManagementMessage("Product created.");
      }

      await refreshProducts();
      return true;
    } catch (error) {
      setManagementMessage(error.message);
      return false;
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct(productId) {
    setManagementMessage("");

    try {
      await deleteProduct(productId);
      setManagementMessage("Product deleted.");
      await refreshProducts();
      return true;
    } catch (error) {
      setManagementMessage(error.message);
      return false;
    }
  }

  async function lookupProduct(rawCode) {
    const rawValue = String(rawCode ?? "").trim();
    const normalizedBarcode = normalizeBarcode(rawValue);
    const barcodeCandidate = isValidEan13(normalizedBarcode) ? normalizedBarcode : "";
    const productCode = barcodeCandidate || rawValue;
    if (!productCode) {
      throw new Error("Barcode is empty.");
    }

    if (barcodeCandidate) {
      return normalizeProduct((await getProductByBarcode(barcodeCandidate)).data);
    }

    return normalizeProduct((await getProductById(rawValue)).data);
  }

  async function handleCheckoutDetectCode(rawCode) {
    setCheckoutLookupBusy(true);
    setCheckoutLookupMessage("");
    setCheckoutMessage("");

    try {
      const foundProduct = await lookupProduct(rawCode);
      setCheckoutSelection({
        product: foundProduct,
        quantity: 1
      });
    } catch (error) {
      setCheckoutLookupMessage(error.message || "Product not found.");
      setCheckoutSelection(null);
    } finally {
      setCheckoutLookupBusy(false);
    }
  }

  async function handlePriceDetectCode(rawCode) {
    setPriceLookupBusy(true);
    setPriceLookupMessage("");

    try {
      const foundProduct = await lookupProduct(rawCode);
      setCheckedProduct(foundProduct);
    } catch (error) {
      setPriceLookupMessage(error.message || "Product not found.");
      setCheckedProduct(null);
    } finally {
      setPriceLookupBusy(false);
    }
  }

  function handleSelectionChange(delta) {
    setCheckoutSelection((currentSelection) => {
      if (!currentSelection) {
        return currentSelection;
      }

      return {
        ...currentSelection,
        quantity: Math.max(1, currentSelection.quantity + delta)
      };
    });
  }

  function handleSelectionConfirm() {
    if (!checkoutSelection) {
      return;
    }

    setCartItems((currentItems) => {
      const existingItem = currentItems.find((item) => item._id === checkoutSelection.product._id);
      if (!existingItem) {
        return [...currentItems, { ...checkoutSelection.product, quantity: checkoutSelection.quantity }];
      }

      return currentItems.map((item) =>
        item._id === checkoutSelection.product._id
          ? {
              ...item,
              quantity: item.quantity + checkoutSelection.quantity
            }
          : item
      );
    });

    setCheckoutMessage(`${checkoutSelection.product.name || "Product"} added to cart.`);
    setCheckoutSelection(null);
  }

  function updateCartQuantity(productId, delta) {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity: item.quantity + delta
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeCartItem(productId) {
    setCartItems((currentItems) => currentItems.filter((item) => item._id !== productId));
  }

  function handleCheckout() {
    setCheckoutMessage(
      `Payment API is not connected yet. Current basket: ${totalItems} item(s) worth ${formatCurrency(totalPrice)}.`
    );
  }

  const totalItems = useMemo(
    () => cartItems.reduce((count, item) => count + item.quantity, 0),
    [cartItems]
  );
  const totalPrice = useMemo(
    () => cartItems.reduce((amount, item) => amount + item.price * item.quantity, 0),
    [cartItems]
  );

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Self Checkout Station</p>
          <h1>Browser-based scanning and product management for a kiosk prototype</h1>
          <p className="hero-copy">
            The checkout flow is ready for scanning, quantity control, and cart building. The management side stays focused on the dummy product API until payment endpoints are available.
          </p>
        </div>

        <aside className="hero-card">
          <p className="eyebrow">Current State</p>
          <div className="hero-stats">
            <div>
              <span>{products.length}</span>
              <p>catalog cached for management</p>
            </div>
            <div>
              <span>{totalItems}</span>
              <p>items in cart</p>
            </div>
          </div>
          <p className="helper-text">
            Checkout and price checking now request fresh product data from the API on every scan. Product Management is the only view that loads the full catalog.
          </p>
        </aside>
      </header>

      <nav className="view-switcher">
        <button
          type="button"
          className={view === "checkout" ? "switch-button active" : "switch-button"}
          onClick={() => setView("checkout")}
        >
          Checkout
        </button>
        <button
          type="button"
          className={view === "price-checker" ? "switch-button active" : "switch-button"}
          onClick={() => setView("price-checker")}
        >
          Price Checker
        </button>
        <button
          type="button"
          className={view === "management" ? "switch-button active" : "switch-button"}
          onClick={() => setView("management")}
        >
          Product Management
        </button>
      </nav>

      {productsError ? <p className="banner error-banner">{productsError}</p> : null}
      {checkoutMessage ? <p className="banner success-banner">{checkoutMessage}</p> : null}
      {loadingProducts ? <p className="banner info-banner">Loading product catalog...</p> : null}

      {view === "checkout" ? (
        <CheckoutView
          selection={checkoutSelection}
          cartItems={cartItems}
          lookupBusy={checkoutLookupBusy}
          lookupMessage={checkoutLookupMessage}
          totalItems={totalItems}
          totalPrice={totalPrice}
          onDetectCode={handleCheckoutDetectCode}
          onSelectionChange={handleSelectionChange}
          onSelectionConfirm={handleSelectionConfirm}
          onSelectionDismiss={() => setCheckoutSelection(null)}
          onCartDecrease={(productId) => updateCartQuantity(productId, -1)}
          onCartIncrease={(productId) => updateCartQuantity(productId, 1)}
          onCartRemove={removeCartItem}
          onCheckout={handleCheckout}
        />
      ) : view === "price-checker" ? (
        <PriceCheckerView
          lookupBusy={priceLookupBusy}
          lookupMessage={priceLookupMessage}
          checkedProduct={checkedProduct}
          onDetectCode={handlePriceDetectCode}
        />
      ) : (
        <ManagementView
          products={products}
          saving={savingProduct}
          onSaveProduct={handleSaveProduct}
          onDeleteProduct={handleDeleteProduct}
          managementMessage={managementMessage}
        />
      )}
    </div>
  );
}
