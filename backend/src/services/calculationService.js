/**
 * Calculation Service
 * Handles all quotation/invoice calculations
 * 
 * PER LINE:
 *   subtotal = qty × unit_price
 *   discount_amount = subtotal × (discount_percent / 100)
 *   base_after_discount = subtotal - discount_amount
 *   iva_amount = base_after_discount × (iva_percent / 100)
 *   line_total = base_after_discount + iva_amount
 * 
 * TOTALS:
 *   total_base = sum(all base_after_discount)
 *   total_iva = sum(all iva_amount)
 *   grand_total = total_base + total_iva
 */
class CalculationService {
    constructor() {
        this.maxDecimalValue = 9999999999.99;
        this.unitTypes = new Set([
            'hour', 'sqft', 'sqm', 'unit', 'contract', 'meter', 'kg', 'service'
        ]);
        this.ivaRates = new Set([21, 10, 4]);
    }

    toNumber(value) {
        if (
            (typeof value !== 'number' && typeof value !== 'string') ||
            (typeof value === 'string' && value.trim() === '')
        ) {
            return null;
        }
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    hasAtMostTwoDecimals(value) {
        return Math.abs(value - Math.round(value * 100) / 100) < 1e-9;
    }

    validateQuotation(items, transportCharge = 0) {
        const transport = this.toNumber(transportCharge);
        if (
            transport === null ||
            transport < 0 ||
            transport > this.maxDecimalValue ||
            !this.hasAtMostTwoDecimals(transport)
        ) {
            return 'Transport charge must be a non-negative amount with at most two decimal places';
        }
        if (!Array.isArray(items) || items.length === 0) {
            return 'At least one item is required';
        }

        for (let index = 0; index < items.length; index += 1) {
            const item = items[index];
            const itemLabel = `Item ${index + 1}`;
            if (!item || typeof item !== 'object' || Array.isArray(item)) {
                return `${itemLabel} is invalid`;
            }
            if (typeof item.description !== 'string' || !item.description.trim()) {
                return `${itemLabel} description is required`;
            }
            if (Buffer.byteLength(item.description, 'utf8') > 65535) {
                return `${itemLabel} description is too long`;
            }

            const quantity = this.toNumber(item.quantity);
            if (
                quantity === null ||
                quantity <= 0 ||
                quantity > this.maxDecimalValue ||
                !this.hasAtMostTwoDecimals(quantity)
            ) {
                return `${itemLabel} quantity must be greater than zero with at most two decimal places`;
            }

            const unitPrice = this.toNumber(item.unit_price);
            if (
                unitPrice === null ||
                unitPrice < 0 ||
                unitPrice > this.maxDecimalValue ||
                !this.hasAtMostTwoDecimals(unitPrice)
            ) {
                return `${itemLabel} unit price must be a non-negative amount with at most two decimal places`;
            }

            const discountPercent = item.discount_percent === undefined
                ? 0
                : this.toNumber(item.discount_percent);
            if (
                discountPercent === null ||
                discountPercent < 0 ||
                discountPercent > 100 ||
                !this.hasAtMostTwoDecimals(discountPercent)
            ) {
                return `${itemLabel} discount must be between 0 and 100 with at most two decimal places`;
            }

            const ivaPercent = item.iva_percent === undefined
                ? 21
                : this.toNumber(item.iva_percent);
            if (ivaPercent === null || !this.ivaRates.has(ivaPercent)) {
                return `${itemLabel} IVA rate must be 21%, 10%, or 4%`;
            }

            const unitType = item.unit_type || 'unit';
            if (typeof unitType !== 'string' || !this.unitTypes.has(unitType)) {
                return `${itemLabel} unit type is invalid`;
            }

            if (item.article_code != null && (
                typeof item.article_code !== 'string' ||
                item.article_code.length > 50
            )) {
                return `${itemLabel} article code must be 50 characters or fewer`;
            }

            if (quantity * unitPrice > this.maxDecimalValue) {
                return `${itemLabel} subtotal exceeds the supported amount`;
            }
        }

        return null;
    }

    calculateQuotation(items, transportCharge = 0) {
        const validationError = this.validateQuotation(items, transportCharge);
        if (validationError) {
            throw new RangeError(validationError);
        }

        const normalizedTransportCharge = this.toNumber(transportCharge);
        let totalSubtotal = 0;
        let totalDiscount = 0;
        let totalBase = 0;
        let totalIva = 0;

        // IVA buckets (21, 10, 4)
        const ivaBuckets = {
            21: { base: 0, iva: 0 },
            10: { base: 0, iva: 0 },
            4:  { base: 0, iva: 0 }
        };

        const processedItems = items.map((item, index) => {
            const qty = this.toNumber(item.quantity);
            const price = this.toNumber(item.unit_price);
            const discPct = item.discount_percent === undefined
                ? 0
                : this.toNumber(item.discount_percent);
            const ivaPct = item.iva_percent === undefined
                ? 21
                : this.toNumber(item.iva_percent);

            // Line 1: Subtotal
            const subtotal = qty * price;

            // Line 2: Discount
            const discountAmount = subtotal * (discPct / 100);

            // Line 3: Base after discount
            const baseAfterDiscount = subtotal - discountAmount;

            // Line 4: IVA
            const ivaAmount = baseAfterDiscount * (ivaPct / 100);

            // Line 5: Line total (with IVA)
            const lineTotal = baseAfterDiscount + ivaAmount;

            // Totals
            totalSubtotal += subtotal;
            totalDiscount += discountAmount;
            totalBase += baseAfterDiscount;
            totalIva += ivaAmount;

            // IVA bucket
            if (ivaBuckets[ivaPct]) {
                ivaBuckets[ivaPct].base += baseAfterDiscount;
                ivaBuckets[ivaPct].iva += ivaAmount;
            }

            return {
                item_order: index + 1,
                article_code: item.article_code || null,
                description: item.description,
                unit_type: item.unit_type || 'unit',
                quantity: this.round(qty),
                unit_price: this.round(price),
                subtotal: this.round(subtotal),
                discount_percent: this.round(discPct),
                discount_amount: this.round(discountAmount),
                base_after_discount: this.round(baseAfterDiscount),
                iva_percent: this.round(ivaPct),
                iva_amount: this.round(ivaAmount),
                line_total: this.round(lineTotal)
            };
        });

        // Transport (adds to 21% base)
        if (normalizedTransportCharge > 0) {
            const transportIva = normalizedTransportCharge * 0.21;
            totalBase += normalizedTransportCharge;
            totalIva += transportIva;
            ivaBuckets[21].base += normalizedTransportCharge;
            ivaBuckets[21].iva += transportIva;
        }

        const grandTotal = totalBase + totalIva;
        if (
            !Number.isFinite(grandTotal) ||
            [totalSubtotal, totalDiscount, totalBase, totalIva, grandTotal]
                .some((value) => value > this.maxDecimalValue)
        ) {
            throw new RangeError('Quotation total exceeds the supported amount');
        }

        return {
            items: processedItems,
            total_subtotal: this.round(totalSubtotal),
            total_discount: this.round(totalDiscount),
            total_base: this.round(totalBase),
            total_iva: this.round(totalIva),
            grand_total: this.round(grandTotal),
            transport_charge: this.round(normalizedTransportCharge),
            iva_21_base: this.round(ivaBuckets[21].base),
            iva_21_amount: this.round(ivaBuckets[21].iva),
            iva_10_base: this.round(ivaBuckets[10].base),
            iva_10_amount: this.round(ivaBuckets[10].iva),
            iva_4_base: this.round(ivaBuckets[4].base),
            iva_4_amount: this.round(ivaBuckets[4].iva)
        };
    }

    round(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }
}

module.exports = new CalculationService();