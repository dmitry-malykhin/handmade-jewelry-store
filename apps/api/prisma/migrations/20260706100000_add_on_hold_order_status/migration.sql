-- Migration: Add ON_HOLD to OrderStatus enum (#346)
-- Reason: Chargeback disputes and fraud flags — freezes the order until admin
-- reviews the issue. Triggered by Stripe `charge.dispute.created` webhook.

ALTER TYPE "OrderStatus" ADD VALUE 'ON_HOLD';
