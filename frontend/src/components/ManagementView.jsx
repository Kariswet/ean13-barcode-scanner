import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Barcode from "react-barcode";

import { isValidEan13, normalizeBarcode } from "../lib/barcode";
import { formatCurrency } from "../lib/format";

const EMPTY_FORM = {
  barcode: "",
  name: "",
  brand: "",
  description: "",
  price: "",
  category: ""
};

function ProductCard({ product, onEdit, onDelete, onCopyCode }) {
  const hasValidBarcode = isValidEan13(product.barcode);

  return (
    <article className="product-card">
      <div className="product-card-top">
        <div>
          <p className="eyebrow">Product</p>
          <h3>{product.name || "Unnamed Product"}</h3>
          <p className="muted-text">
            {product.brand || "-"} · {product.category || "-"}
          </p>
        </div>
        <div className="label-preview">
          {hasValidBarcode ? (
            <Barcode
              value={product.barcode}
              format="EAN13"
              displayValue={false}
              width={1.2}
              height={52}
              margin={0}
              lineColor="#221d19"
              background="transparent"
            />
          ) : (
            <QRCodeSVG value={product._id} size={96} bgColor="transparent" fgColor="#221d19" />
          )}
        </div>
      </div>

      <div className="detail-stack">
        <p>
          <strong>EAN-13:</strong> <span className="mono-text">{product.barcode || "-"}</span>
        </p>
        <p>
          <strong>Price:</strong> {formatCurrency(product.price)}
        </p>
        <p>
          <strong>Code:</strong> <span className="mono-text">{product._id}</span>
        </p>
        <p className="muted-text">{product.description || "No description provided."}</p>
      </div>

      <div className="button-row">
        <button type="button" className="secondary-button" onClick={() => onEdit(product)}>
          Edit
        </button>
        <button type="button" className="ghost-button" onClick={() => onCopyCode(product.barcode || product._id)}>
          Copy Barcode
        </button>
        <button type="button" className="text-button danger-text" onClick={() => onDelete(product)}>
          Delete
        </button>
      </div>
    </article>
  );
}

export function ManagementView({ products, saving, onSaveProduct, onDeleteProduct, managementMessage }) {
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!editingProduct) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      barcode: editingProduct.barcode || "",
      name: editingProduct.name || "",
      brand: editingProduct.brand || "",
      description: editingProduct.description || "",
      price: editingProduct.price ?? "",
      category: editingProduct.category || ""
    });
  }, [editingProduct]);

  const filteredProducts = useMemo(() => {
    const keyword = deferredSearchQuery.trim().toLowerCase();
    if (!keyword) {
      return products;
    }

    return products.filter((product) =>
      [product.name, product.brand, product.category, product.description, product._id, product.barcode]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword))
    );
  }, [deferredSearchQuery, products]);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: name === "barcode" ? normalizeBarcode(value) : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const wasSaved = await onSaveProduct(form, editingProduct?._id || null);
    if (!wasSaved) {
      return;
    }

    setEditingProduct(null);
    setForm(EMPTY_FORM);
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(`Delete ${product.name || "this product"}?`);
    if (!confirmed) {
      return;
    }

    const wasDeleted = await onDeleteProduct(product._id);
    if (wasDeleted && editingProduct?._id === product._id) {
      setEditingProduct(null);
      setForm(EMPTY_FORM);
    }
  }

  async function handleCopyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
    } catch (error) {
      window.prompt("Copy this product code:", code);
    }
  }

  return (
    <div className="view-grid">
      <div className="content-stack">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Product Management</p>
              <h2>{editingProduct ? "Edit existing product" : "Create a new product"}</h2>
            </div>
            {editingProduct ? (
              <button type="button" className="ghost-button" onClick={() => setEditingProduct(null)}>
                Cancel Edit
              </button>
            ) : null}
          </div>

          <form className="product-form" onSubmit={handleSubmit}>
            <label>
              EAN-13 Barcode
              <input
                name="barcode"
                value={form.barcode}
                onChange={handleFieldChange}
                placeholder="8991001000019"
                inputMode="numeric"
                pattern="\d{13}"
                maxLength="13"
                required
              />
            </label>

            <label>
              Product Name
              <input name="name" value={form.name} onChange={handleFieldChange} placeholder="Frisian Flag" required />
            </label>

            <label>
              Brand
              <input name="brand" value={form.brand} onChange={handleFieldChange} placeholder="Bendera" required />
            </label>

            <label>
              Category
              <input name="category" value={form.category} onChange={handleFieldChange} placeholder="SKM" required />
            </label>

            <label>
              Price
              <input name="price" type="number" min="0" value={form.price} onChange={handleFieldChange} placeholder="20000" required />
            </label>

            <label className="full-span">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleFieldChange}
                placeholder="Short note to help cashiers or customers"
                rows="4"
              />
            </label>

            <div className="button-row full-span">
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? "Saving..." : editingProduct ? "Save Changes" : "Add Product"}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setEditingProduct(null);
                  setForm(EMPTY_FORM);
                }}
              >
                Clear Form
              </button>
            </div>
          </form>

          <p className="helper-text">
            Checkout now expects a real product barcode. Enter a valid <span className="mono-text">EAN-13</span> value here, then test scan with the physical package or the barcode preview on the product card.
          </p>
          {managementMessage ? <p className="alert-text">{managementMessage}</p> : null}
        </section>
      </div>

      <div className="content-stack">
        <section className="panel inventory-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>Maintain the product catalog</h2>
            </div>
            <span className="status-pill status-muted">{products.length} product(s)</span>
          </div>

          <div className="search-bar">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, brand, category, description, barcode, or code"
            />
          </div>

          <div className="product-grid">
            {filteredProducts.length === 0 ? (
              <p className="muted-text">No product matches the current search.</p>
            ) : (
              filteredProducts.map((product) => (
                <ProductCard key={product._id} product={product} onEdit={setEditingProduct} onDelete={handleDelete} onCopyCode={handleCopyCode} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
