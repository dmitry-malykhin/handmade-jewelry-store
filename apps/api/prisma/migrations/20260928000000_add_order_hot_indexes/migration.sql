CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt" DESC);
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_refundedAt_idx" ON "Order"("refundedAt");
CREATE INDEX "Order_guestEmail_idx" ON "Order"("guestEmail");
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
