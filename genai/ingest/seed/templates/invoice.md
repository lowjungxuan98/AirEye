# Output format: Invoice → structured JSON

When the document is an invoice, normalize the extracted text into this exact JSON shape.
Preserve the invoice number verbatim. Amounts are numbers, not strings.

```json
{
  "document_type": "invoice",
  "invoice_number": "string",
  "issued_at": "YYYY-MM-DD",
  "due_at": "YYYY-MM-DD|null",
  "seller": { "name": "string", "tax_id": "string|null" },
  "buyer": { "name": "string", "address": "string|null" },
  "currency": "USD",
  "line_items": [
    { "description": "string", "quantity": 1, "unit_price": 0.0, "amount": 0.0 }
  ],
  "subtotal": 0.0,
  "tax": 0.0,
  "total": 0.0
}
```

## Example

Extracted text:
```
INVOICE #INV-2041
Acme Studios (Tax ID 99-1234567)
Bill to: Beta LLC, 88 Market St
Issued 2024-05-02  Due 2024-06-01
Design retainer  1  1200.00  1200.00
Subtotal 1200.00
Tax 0.00
Total 1200.00
```

Normalized output:
```json
{
  "document_type": "invoice",
  "invoice_number": "INV-2041",
  "issued_at": "2024-05-02",
  "due_at": "2024-06-01",
  "seller": { "name": "Acme Studios", "tax_id": "99-1234567" },
  "buyer": { "name": "Beta LLC", "address": "88 Market St" },
  "currency": "USD",
  "line_items": [
    { "description": "Design retainer", "quantity": 1, "unit_price": 1200.00, "amount": 1200.00 }
  ],
  "subtotal": 1200.00,
  "tax": 0.00,
  "total": 1200.00
}
```
