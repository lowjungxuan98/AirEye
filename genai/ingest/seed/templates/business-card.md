# Output format: Business card → structured JSON

When the document is a business card or contact, normalize into this exact JSON shape.
Split the full name when possible. Keep phone numbers in their printed format.

```json
{
  "document_type": "business_card",
  "full_name": "string",
  "title": "string|null",
  "company": "string|null",
  "email": "string|null",
  "phone": "string|null",
  "website": "string|null",
  "address": "string|null"
}
```

## Example

Extracted text:
```
Jane Tan
Head of Operations
Nimbus Logistics
jane.tan@nimbus.co  +60 12-345 6789
www.nimbus.co
Level 8, Tower A, Cyberjaya
```

Normalized output:
```json
{
  "document_type": "business_card",
  "full_name": "Jane Tan",
  "title": "Head of Operations",
  "company": "Nimbus Logistics",
  "email": "jane.tan@nimbus.co",
  "phone": "+60 12-345 6789",
  "website": "www.nimbus.co",
  "address": "Level 8, Tower A, Cyberjaya"
}
```
