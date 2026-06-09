# Output format: Receipt → structured JSON

When the document is a receipt, normalize the extracted text into this exact JSON shape.
Use `null` for missing fields. Currency as a 3-letter ISO code. Dates as `YYYY-MM-DD`.

```json
{
  "document_type": "receipt",
  "merchant": { "name": "string", "address": "string|null", "phone": "string|null" },
  "purchased_at": "YYYY-MM-DD",
  "currency": "MYR",
  "line_items": [
    { "description": "string", "quantity": 1, "unit_price": 0.0, "amount": 0.0 }
  ],
  "subtotal": 0.0,
  "tax": 0.0,
  "total": 0.0,
  "payment_method": "string|null"
}
```

## Example

Extracted text:
```
SUNSHINE MART
12 Jalan Besar, KL
2024-03-11 14:22
Milk 2 x 3.50 7.00
Bread 1 x 2.20 2.20
Subtotal 9.20
GST 6% 0.55
TOTAL 9.75
VISA
```

Normalized output:
```json
{
  "document_type": "receipt",
  "merchant": { "name": "Sunshine Mart", "address": "12 Jalan Besar, KL", "phone": null },
  "purchased_at": "2024-03-11",
  "currency": "MYR",
  "line_items": [
    { "description": "Milk", "quantity": 2, "unit_price": 3.50, "amount": 7.00 },
    { "description": "Bread", "quantity": 1, "unit_price": 2.20, "amount": 2.20 }
  ],
  "subtotal": 9.20,
  "tax": 0.55,
  "total": 9.75,
  "payment_method": "VISA"
}
```
