/** Indian local and +91 forms share an identity; other explicit country codes remain intact. */
export function phoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;
}
export function matchesCustomer(
  customer: { name: string; phone: string },
  query: string,
) {
  const term = query.trim().toLowerCase();
  return (
    `${customer.name} ${customer.phone}`.toLowerCase().includes(term) ||
    (/^[+\d\s-]+$/.test(term) &&
      Boolean(phoneKey(term)) &&
      phoneKey(customer.phone).includes(phoneKey(term)))
  );
}
