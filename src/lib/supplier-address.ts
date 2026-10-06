/** Naslov zahteve za dobavitelja v eni vrstici — za zapis v ticket in seznam. */
export function addressLine(address: {
  recipient?: string | null; company?: string | null; address1?: string | null; address2?: string | null;
  zip?: string | null; city?: string | null; province?: string | null; country?: string | null; countryCode?: string | null;
}): string {
  const town = [address.zip, address.city].filter(Boolean).join(" ");
  return [
    address.recipient,
    address.company,
    address.address1,
    address.address2,
    town,
    address.province,
    address.country || address.countryCode,
  ].map((part) => (part ?? "").trim()).filter(Boolean).join(", ");
}
