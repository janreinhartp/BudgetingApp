# User-Flow Audit

## Scope

This audit describes the current implementation before changing source code or
the database. The application is an offline Electron/React app backed by
SQLite. The current schema has separate `bills`, `debts`, `transactions`, and
`accounts` tables, but no bill-occurrence or payment records and no foreign-key
relationship from a transaction to a bill or debt.

## Current workflows

### 1. Adding a bill

On the Bills screen, the user fills an always-visible form with a name, amount,
day of month, frequency, category, account, and optional duration. Category
and account can be left empty. Saving creates one row in `bills`. The screen
then shows all bills as cards with status, amount, due day/frequency,
category/account, and optional duration. There is no empty-state prompt or
dedicated “Add Bill” action.

**Unnecessary friction:** The form exposes installment duration alongside
ordinary bill details. A user has to choose whether a payment will also become
an expense later, rather than having a normal payment action with sensible
defaults.

### 2. Paying a bill

The user clicks **Mark Paid** on the bill card. A browser confirmation asks
whether to also create an expense transaction. The service marks the bill
paid today and updates its `last_paid_date`; if confirmed, it separately
creates a full-amount Expense transaction using the bill’s saved category and
account. There is no payment date, amount, notes, partial-payment entry,
confirmation summary, or payment history.

**Unnecessary friction and risks:** The extra yes/no decision makes the user
decide how the ledger works. The bill and optional transaction are separate
records without a shared identifier. There is no way to pay part of a bill or
avoid paying it twice through this action. `last_paid_date` records only the
latest date, so prior payments cannot be reconstructed. The bill status update
and transaction creation are not wrapped together as one database
transaction.

### 3. Adding debt

On the Debt screen, the user fills an always-visible form with debt name,
original balance, current balance, minimum payment, planned payment, due day,
and account, then clicks **Add**. The screen summarizes total debt, total
planned monthly payments, and amount paid off based on the difference between
original and current balance.

**Unnecessary friction and gaps:** The user enters both original and current
balances, even for a new debt where they are usually the same. There is no
payment frequency or cutoff assignment, and no “Add Debt” empty-state action.
Editing current balance is the only way to represent debt reduction.

### 4. Paying debt

There is no Record Payment action in the Debt screen. The user must separately
add a transaction from Transactions, choose **Debt Payment**, select category,
amount, account, and cutoff, and then manually edit the debt’s current balance
on the Debt screen. The transaction has no debt reference.

**Unnecessary friction and risks:** One real payment requires two manual
updates on different screens. Payment history cannot be associated with the
debt, and changing or deleting the transaction does not adjust the balance.
Debt payments are included in dashboard cash-flow totals, but do not have a
relationship to the debt balance they are meant to change.

### 5. Paying a credit card

The Accounts screen allows an account to be typed as **Credit Card** and can
show available credit as credit limit minus the stored account balance. There
is no dedicated payment action or statement/minimum-due information. The
generic Transactions form offers **Debt Payment** and **Transfer**, but has
only one account selector; it cannot explicitly identify both the card being
paid and the account funds come from.

**Unnecessary friction and risks:** A user must infer which generic transaction
type to use and how to represent both sides. A card payment can be recorded as
a Debt Payment or Expense without any guard against counting it as spending a
second time.

### 6. Recording ordinary expenses

The Transactions screen has an always-visible form. The user enters date,
type, category, amount, and optionally description, account, notes, and cutoff.
The list can be filtered by month, category, account, and description/notes;
each row can be edited or deleted.

**Unnecessary friction:** This is the only normal entry point for purchases
that are not bills or debts, so it asks users to work with transaction types
and categories directly. The screen mixes entry of ordinary expenses with
income, savings, debt payments, and transfers. There is no prominent
action-based Quick Add entry point.

### 7. Transferring money

The transaction type includes **Transfer**, but the transaction model and form
store only one account ID. No transfer-specific source and destination fields
or paired account movements are created.

**Unnecessary friction and risks:** A transfer cannot be described as movement
between two accounts in the current record. The cutoff service counts every
non-Income transaction, including Transfer, as an outflow, even though a
transfer is not spending.

## Related behavior affecting these workflows

- **Bills are templates only in name.** A bill row has a frequency, due day,
  status, and last-paid date, but there are no date-specific occurrences. The
  bill list is the template list; it cannot show separate September and
  October instances. Status is recomputed from the current day of month and
  whether `last_paid_date` falls in the current month, without considering
  frequency.
- **Dashboard bill items are not occurrence-aware.** The dashboard lists
  unpaid bill templates sorted by due day, shows only the day number, and
  offers no Pay action. It does not include debts due for payment. Monthly bill
  totals use paid bills’ `last_paid_date`; if the user also creates the
  optional Expense transaction, the same bill payment is included in both the
  expense total and bill total.
- **Budgets count only Expense transactions.** A bill marked paid without the
  optional Expense transaction does not affect category spending. When that
  transaction is created, the bill amount may be double-counted in the
  dashboard’s combined expense and bill figures.
- **Transactions do not drive account balances.** The account service stores
  the balance entered or edited on the Accounts screen. Creating, editing, or
  deleting transactions does not update it; consequently a payment currently
  cannot automatically update an account balance.
- **Cutoff assignment is transaction-only.** The user can assign a cutoff in
  the generic transaction form, and cutoff planning aggregates transaction
  amounts. Bills and debts cannot be assigned to a cutoff at setup.
- **No payment history exists.** The database has no payment table or bill /
  debt foreign key on transactions. Editing or deleting a ledger transaction
  cannot update a bill status or debt balance.

## Smallest architecture changes to enable the target UX

1. **Keep the existing concepts and ledger.** Continue using bills as recurring
   templates, debts as balance records, accounts and categories as currently
   modeled, and transactions as the detailed financial ledger. Do not replace
   the application or introduce external services.
2. **Add occurrence/payment identity where the current schema lacks it.**
   Introduce date-specific bill occurrences and payment records, linked to the
   relevant bill occurrence or debt and to the generated transaction. A
   payment should be the source for paid amount/date/notes; do not keep a
   second unlinked copy of the payment in each screen’s state. Support partial
   payments by summing payments for an occurrence.
3. **Make payment plus ledger effects atomic.** Use one service operation and
   a SQLite transaction to create the payment, create/link its ledger record,
   update the occurrence or debt balance, and apply the account movement.
   Editing/deleting a payment must recalculate or reverse those same effects.
4. **Represent ordinary bills and debt/card payments differently.** A normal
   bill payment should create an Expense transaction. A debt/card repayment
   should reduce the debt and represent a transfer/payment between accounts,
   not create a second Expense. The transfer representation must identify
   both accounts; the existing single `account_id` transaction field is not
   sufficient on its own.
5. **Separate user-facing actions from transaction entry.** Add Pay and Record
   Payment dialogs to bill/debt views, and expose the existing generic
   transaction entry as an advanced path for unrelated expenses, income, and
   transfers. Reuse the existing IPC/service boundaries for these actions.
6. **Derive summaries from the correct records.** Show upcoming bill
   occurrences and due debts on the dashboard; base payment history, monthly
   bills, budget spending, and cutoff totals on linked payments/transactions
   without counting a payment twice. Exclude transfers from spending while
   retaining them as account movements.
7. **Migrate incrementally.** The SQLite schema is initialized in
   `src/main/database/db.ts` and already uses an explicit column migration for
   bill duration. Before implementation, define how existing `last_paid_date`
   values and unlinked `Debt Payment` transactions should be treated; do not
   silently infer or duplicate historical payment records. Add only the
   required schema columns/tables and preserve existing data and screens while
   each workflow is migrated.

The first user-facing phases can be delivered without a broad rewrite: improve
bill creation, then add bill occurrences and an integrated payment action;
next add integrated debt payments and history; then align credit-card,
dashboard, cutoff, and transaction behavior with those linked records.
