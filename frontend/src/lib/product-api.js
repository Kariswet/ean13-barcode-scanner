const PRODUCT_BASE_URL = "/api/v1/product";

async function readResponse(response) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.detail || "The server rejected the request.");
  }

  if (body?.metadata && body.metadata.status === false) {
    throw new Error(body.metadata.message || "The operation failed.");
  }

  return body;
}

async function sendRequest(path = "", options = {}) {
  const headers = options.body
    ? {
        "Content-Type": "application/json",
        ...options.headers
      }
    : options.headers;

  const response = await fetch(`${PRODUCT_BASE_URL}${path}`, {
    ...options,
    headers
  });

  return readResponse(response);
}

export function listProducts() {
  return sendRequest();
}

export function getProductById(productId) {
  return sendRequest(`/${productId}`);
}

export function getProductByBarcode(barcode) {
  return sendRequest(`/barcode/${barcode}`);
}

export function createProduct(payload) {
  return sendRequest("", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProduct(productId, payload) {
  return sendRequest(`/${productId}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteProduct(productId) {
  return sendRequest(`/${productId}`, {
    method: "DELETE"
  });
}
