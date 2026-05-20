import { ScannerPanel } from "./CheckoutView";
import { formatCurrency } from "../lib/format";

function PriceResultCard({ product }) {
  if (!product) {
    return (
      <section className="panel pending-panel">
        <p className="eyebrow">Price Check</p>
        <h2>Waiting for a product scan</h2>
        <p className="muted-text">
          Scan an item to show its latest name, brand, category, and price without adding it to a cart.
        </p>
      </section>
    );
  }

  return (
    <section className="panel pending-panel">
      <p className="eyebrow">Price Check</p>
      <h2>{product.name || "Unnamed Product"}</h2>
      <div className="detail-stack">
        <p>
          <strong>Brand:</strong> {product.brand || "-"}
        </p>
        <p>
          <strong>Category:</strong> {product.category || "-"}
        </p>
        <p>
          <strong>EAN-13:</strong> <span className="mono-text">{product.barcode || "-"}</span>
        </p>
        <p>
          <strong>Price:</strong> {formatCurrency(product.price)}
        </p>
        <p className="muted-text">{product.description || "No description provided."}</p>
      </div>
    </section>
  );
}

export function PriceCheckerView({ lookupBusy, lookupMessage, checkedProduct, onDetectCode }) {
  return (
    <div className="view-grid">
      <div className="content-stack">
        <section className="panel intro-panel">
          <p className="eyebrow">Flow</p>
          <h2>Independent price checking</h2>
          <div className="step-list">
            <p>1. Scan the physical product barcode or type the EAN-13 manually.</p>
            <p>2. The browser asks the API for the latest product data every time.</p>
            <p>3. The customer can confirm the price without entering checkout.</p>
          </div>
        </section>

        <ScannerPanel
          lookupBusy={lookupBusy}
          lookupMessage={lookupMessage}
          onDetectCode={onDetectCode}
          title="Scan a product to check its current price"
        />
      </div>

      <div className="content-stack">
        <PriceResultCard product={checkedProduct} />
      </div>
    </div>
  );
}
