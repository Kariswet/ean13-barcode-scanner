import { BrowserCodeReader, BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import { useEffect, useMemo, useRef, useState } from "react";

import { formatCurrency } from "../lib/format";

function QuantityControl({ value, onDecrease, onIncrease }) {
  return (
    <div className="quantity-control">
      <button type="button" className="ghost-button" onClick={onDecrease} disabled={value <= 1}>
        -
      </button>
      <span>{value}</span>
      <button type="button" className="ghost-button" onClick={onIncrease}>
        +
      </button>
    </div>
  );
}

export function ScannerPanel({ lookupBusy, lookupMessage, onDetectCode, title = "Use the browser as your scanner" }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [scannerMessage, setScannerMessage] = useState("Camera idle. This scanner supports EAN-13, UPC, Code 128, and QR.");
  const [manualCode, setManualCode] = useState("");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const videoRef = useRef(null);
  const cooldownRef = useRef(0);
  const lastDetectedCodeRef = useRef("");
  const lookupBusyRef = useRef(false);

  useEffect(() => {
    lookupBusyRef.current = lookupBusy;
  }, [lookupBusy]);

  useEffect(() => {
    let ignore = false;

    async function setupScanner() {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (!ignore) {
          setScannerReady(false);
          setScannerMessage("This browser does not expose camera access. Use a modern browser on HTTPS or localhost, or type the barcode manually.");
        }
        return;
      }

      try {
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.QR_CODE
        ]);

        readerRef.current = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 250,
          delayBetweenScanSuccess: 1200
        });

        const devices = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
        if (!ignore) {
          setAvailableCameras(devices);
          if (!selectedCameraId && devices.length > 0) {
            const preferredCamera =
              devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId ||
              devices[0].deviceId;
            setSelectedCameraId(preferredCamera);
          }
        }

        if (ignore) {
          return;
        }

        setScannerReady(true);
        setScannerMessage("Scanner ready. Start the camera and point it at an EAN-13 product barcode.");
      } catch (error) {
        if (!ignore) {
          setScannerReady(false);
          setScannerMessage("Scanner setup failed. You can still type the barcode manually.");
        }
      }
    }

    setupScanner();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function refreshCameras() {
    const devices = await BrowserCodeReader.listVideoInputDevices().catch(() => []);
    setAvailableCameras(devices);
    if (!selectedCameraId && devices.length > 0) {
      const preferredCamera =
        devices.find((device) => /back|rear|environment/i.test(device.label))?.deviceId ||
        devices[0].deviceId;
      setSelectedCameraId(preferredCamera);
    }
  }

  async function startCamera(deviceId = selectedCameraId || undefined) {
    if (!scannerReady) {
      return;
    }

    if (!window.isSecureContext) {
      setScannerMessage("Camera access requires a secure context. Open this app from localhost or HTTPS.");
      return;
    }

    stopCamera();
    setScannerMessage("Requesting camera access...");

    try {
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const detectedCode = result.getText().trim();
            const detectedFormat = String(result.getBarcodeFormat());
            const now = Date.now();

            if (!detectedCode || lookupBusyRef.current) {
              return;
            }

            if (
              lastDetectedCodeRef.current === detectedCode &&
              now - cooldownRef.current < 1600
            ) {
              return;
            }

            lastDetectedCodeRef.current = detectedCode;
            cooldownRef.current = now;
            setManualCode(detectedCode);
            setScannerMessage(`Detected ${detectedFormat}. Looking up ${detectedCode}...`);
            await onDetectCode(detectedCode);
            return;
          }

          if (
            error &&
            !["NotFoundException", "ChecksumException", "FormatException"].includes(error.name)
          ) {
            setScannerMessage("Camera is live, but the scanner reported an unexpected read error. Hold the barcode steady and try again.");
          }
        }
      );

      setCameraActive(true);
      setScannerMessage("Camera live. Point the EAN-13 barcode inside the frame.");
      await refreshCameras();
    } catch (error) {
      setCameraActive(false);
      setScannerMessage("Camera access failed. Allow browser camera permission, then start the scanner again.");
    }
  }

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    if (videoRef.current) {
      BrowserCodeReader.cleanVideoSource(videoRef.current);
    }

    setCameraActive(false);
  }

  async function handleManualSubmit(event) {
    event.preventDefault();
    const cleanedCode = manualCode.trim();
    if (!cleanedCode) {
      return;
    }

    await onDetectCode(cleanedCode);
  }

  async function handleFileScan(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !readerRef.current) {
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    try {
      const result = await readerRef.current.decodeFromImageUrl(imageUrl);
      const detectedCode = result.getText().trim();
      setManualCode(detectedCode);
      setScannerMessage(`Detected code ${detectedCode} from image. Looking up product...`);
      await onDetectCode(detectedCode);
    } catch (error) {
      setScannerMessage("Image scan failed. Make sure the file contains a clear EAN-13 barcode or QR code.");
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function handleCameraChange(event) {
    const nextCameraId = event.target.value;
    setSelectedCameraId(nextCameraId);

    if (cameraActive) {
      await startCamera(nextCameraId);
    }
  }

  return (
    <section className="panel scanner-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Scan Product</p>
          <h2>{title}</h2>
        </div>
        <span className={`status-pill ${scannerReady ? "status-live" : "status-muted"}`}>
          {cameraActive ? "Camera Live" : scannerReady ? "Scanner Ready" : "Manual Fallback"}
        </span>
      </div>

      <div className="scanner-stage">
        <video ref={videoRef} className="scanner-video" muted playsInline />
        <div className="scanner-frame">
          <span />
        </div>
      </div>

      <p className="muted-text">{scannerMessage}</p>
      {lookupMessage ? <p className="alert-text">{lookupMessage}</p> : null}

      {availableCameras.length > 0 ? (
        <div className="camera-picker">
          <label>
            Camera
            <select value={selectedCameraId} onChange={handleCameraChange}>
              {availableCameras.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${index + 1}`}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <div className="scanner-actions">
        <button type="button" className="primary-button" onClick={() => (cameraActive ? stopCamera() : startCamera())} disabled={!scannerReady && !cameraActive}>
          {cameraActive ? "Stop Camera" : "Start Camera"}
        </button>
        <label className="ghost-button file-button">
          Scan From Image
          <input type="file" accept="image/*" onChange={handleFileScan} />
        </label>
      </div>

      <form className="manual-form" onSubmit={handleManualSubmit}>
        <input
          type="text"
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="Paste or type the EAN-13 barcode"
        />
        <button type="submit" className="secondary-button" disabled={lookupBusy}>
          {lookupBusy ? "Checking..." : "Find Product"}
        </button>
      </form>

      <p className="helper-text">
        Supported formats: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, and QR. For camera access, run the app on localhost or HTTPS and allow permission when the browser asks.
      </p>
    </section>
  );
}

function PendingProductCard({ selection, onIncrease, onDecrease, onConfirm, onDismiss }) {
  if (!selection) {
    return (
      <section className="panel pending-panel">
        <p className="eyebrow">Current Scan</p>
        <h2>Waiting for the next product</h2>
        <p className="muted-text">
          After the customer scans a product, its detail appears here. They can confirm with Yes and set the quantity before it goes into the cart.
        </p>
      </section>
    );
  }

  const { product, quantity } = selection;

  return (
    <section className="panel pending-panel">
      <p className="eyebrow">Current Scan</p>
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
          <strong>Code:</strong> <span className="mono-text">{product._id}</span>
        </p>
        <p>
          <strong>Price:</strong> {formatCurrency(product.price)}
        </p>
        <p className="muted-text">{product.description || "No description provided."}</p>
      </div>

      <QuantityControl value={quantity} onDecrease={onDecrease} onIncrease={onIncrease} />

      <div className="button-row">
        <button type="button" className="primary-button" onClick={onConfirm}>
          Yes, Add to Cart
        </button>
        <button type="button" className="ghost-button" onClick={onDismiss}>
          Skip This Item
        </button>
      </div>
    </section>
  );
}

function CartPanel({ cartItems, totalItems, totalPrice, onDecrease, onIncrease, onRemove, onCheckout }) {
  return (
    <section className="panel cart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Shopping Cart</p>
          <h2>Customer basket</h2>
        </div>
        <span className="status-pill status-muted">{totalItems} item(s)</span>
      </div>

      <div className="cart-list">
        {cartItems.length === 0 ? (
          <p className="muted-text">No product has been added yet.</p>
        ) : (
          cartItems.map((item) => (
            <article className="cart-item" key={item._id}>
              <div>
                <h3>{item.name || "Unnamed Product"}</h3>
                <p className="mono-text">{item._id}</p>
                <p className="muted-text">{formatCurrency(item.price)} each</p>
              </div>

              <div className="cart-actions">
                <QuantityControl value={item.quantity} onDecrease={() => onDecrease(item._id)} onIncrease={() => onIncrease(item._id)} />
                <button type="button" className="text-button" onClick={() => onRemove(item._id)}>
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="checkout-card">
        <div>
          <p className="muted-text">Estimated total</p>
          <h3>{formatCurrency(totalPrice)}</h3>
        </div>
        <button type="button" className="secondary-button" disabled={cartItems.length === 0} onClick={onCheckout}>
          Continue to Pay
        </button>
      </div>
    </section>
  );
}

export function CheckoutView({
  selection,
  cartItems,
  lookupBusy,
  lookupMessage,
  totalItems,
  totalPrice,
  onDetectCode,
  onSelectionChange,
  onSelectionConfirm,
  onSelectionDismiss,
  onCartDecrease,
  onCartIncrease,
  onCartRemove,
  onCheckout
}) {
  const steps = useMemo(
    () => [
      "1. Scan the EAN-13 barcode from the product or the barcode preview in Product Management.",
      "2. Confirm the product with Yes and set the quantity.",
      "3. Continue scanning until the customer is ready to pay."
    ],
    []
  );

  return (
    <div className="view-grid">
      <div className="content-stack">
        <section className="panel intro-panel">
          <p className="eyebrow">Flow</p>
          <h2>Self checkout for a browser-first kiosk</h2>
          <div className="step-list">
            {steps.map((step) => (
              <p key={step}>{step}</p>
            ))}
          </div>
        </section>

        <ScannerPanel lookupBusy={lookupBusy} lookupMessage={lookupMessage} onDetectCode={onDetectCode} />
      </div>

      <div className="content-stack">
        <PendingProductCard
          selection={selection}
          onIncrease={() => onSelectionChange(1)}
          onDecrease={() => onSelectionChange(-1)}
          onConfirm={onSelectionConfirm}
          onDismiss={onSelectionDismiss}
        />

        <CartPanel
          cartItems={cartItems}
          totalItems={totalItems}
          totalPrice={totalPrice}
          onDecrease={onCartDecrease}
          onIncrease={onCartIncrease}
          onRemove={onCartRemove}
          onCheckout={onCheckout}
        />
      </div>
    </div>
  );
}
