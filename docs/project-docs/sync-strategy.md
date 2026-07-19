# Sync Strategy

All five apps synchronize through one shared development Firebase project,
shared domain types, validation, repositories, services, query keys, and
trusted command contracts. Customer Web and Customer App use the same catalog,
cart, order, and notification semantics; Merchant, Driver, and Admin views act
on the same canonical order.

Use TanStack Query for server/Firebase state and Zustand only for local UI
state. Realtime listeners are limited to active customer tracking, merchant
incoming orders, admin active orders, assigned driver work, and active driver
location. Historical lists, catalogs, settings, and dashboard summaries use
bounded cached or paginated queries.

Payment, fulfillment, assignment, and needs-action data are separate fields on
the same order contract. Commands return the refreshed canonical resource;
clients do not manufacture irreversible local success.

All integration fixtures carry `testRunId` and are cleaned only by the
privileged development cleanup workflow.
