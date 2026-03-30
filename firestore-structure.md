# Firestore Data Structure

All data lives under a single household document. The `householdId` is generated on first load and stored in `localStorage` with the key `familyfinance_household_id`.

```
/households/{householdId}/
  income/          (subcollection)
    {docId}: { label, amount, recurring, monthKey, createdAt }

  expenses/        (subcollection)
    {docId}: { label, amount, planned, category, itemType, dueDate, monthKey, createdAt }

  bills/           (subcollection)
    {docId}: { label, amount, dueDay, paid, monthKey, createdAt }

  debts/           (subcollection)
    {docId}: { label, balance, minPayment, interestRate, createdAt }

  savings/         (subcollection)
    {docId}: { label, currentAmount, targetAmount, createdAt }

  monthlyNotes/    (subcollection)
    {monthKey}: { notes, updatedAt }
```

## Environment Variables

The following must be set in both `.env.local` (local dev) and Netlify dashboard (production):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
