export const UNIT_TYPES = [
    { value: 'unit', label: 'Unit' },
    { value: 'hour', label: 'Hour' },
    { value: 'sqm', label: 'm²' },
    { value: 'sqft', label: 'ft²' },
    { value: 'meter', label: 'Meter' },
    { value: 'kg', label: 'Kg' },
    { value: 'contract', label: 'Contract' },
    { value: 'service', label: 'Service' },
];

export const IVA_RATES = [
    { value: 21, label: '21%' },
    { value: 10, label: '10%' },
    { value: 4, label: '4%' },
];

export function applyProduct(item, product) {
    return {
        ...item,
        article_code: product.article_code || '',
        description: product.description,
        unit_type: product.unit_type,
        unit_price: Number(product.unit_price),
        iva_percent: Number(product.iva_percent),
    };
}
