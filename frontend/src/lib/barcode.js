export function normalizeBarcode(value) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

export function isValidEan13(value) {
  const digits = normalizeBarcode(value);
  if (!/^\d{13}$/.test(digits)) {
    return false;
  }

  const numbers = digits.split("").map(Number);
  const checksum = numbers.pop();
  const weightedTotal = numbers.reduce(
    (sum, digit, index) => sum + digit * (index % 2 === 0 ? 1 : 3),
    0
  );
  const expectedChecksum = (10 - (weightedTotal % 10)) % 10;

  return checksum === expectedChecksum;
}
