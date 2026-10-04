function parseFilters(query, statusKey, statuses) {
    const { search = '', page = '1', limit = '10', date_from = '', date_to = '' } = query;
    const status = query[statusKey] || '';
    const validDate = (value) => {
        if (value === '') return true;
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1000-01-01') return false;
        const date = new Date(`${value}T00:00:00Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (typeof search !== 'string' || search.length > 200 ||
        typeof status !== 'string' || (status && !statuses.includes(status)) ||
        !/^[1-9]\d*$/.test(String(page)) || !Number.isSafeInteger(Number(page)) ||
        !/^[1-9]\d*$/.test(String(limit)) || Number(limit) > 100 ||
        !Number.isSafeInteger((Number(page) - 1) * Number(limit)) ||
        !validDate(date_from) || !validDate(date_to) || (date_from && date_to && date_from > date_to)) {
        return { error: 'Invalid search, status, date range or pagination' };
    }
    return { search: search.trim(), status, page: Number(page), limit: Number(limit), date_from, date_to };
}

function buildFilter(alias, dateColumn, statusColumn, businessId, filters) {
    const conditions = [`${alias}.business_id = ?`];
    const params = [businessId];
    if (filters.status) {
        conditions.push(`${alias}.${statusColumn} = ?`);
        params.push(filters.status);
    }
    if (filters.search) {
        conditions.push(`(${alias}.${alias === 'q' ? 'quotation_number' : 'invoice_number'} LIKE ? OR c.name LIKE ? OR c.nif_cif LIKE ?)`);
        params.push(...Array(3).fill(`%${filters.search}%`));
    }
    for (const [key, operator] of [['date_from', '>='], ['date_to', '<=']]) {
        if (filters[key]) {
            conditions.push(`${alias}.${dateColumn} ${operator} ?`);
            params.push(filters[key]);
        }
    }
    return { where: conditions.join(' AND '), params };
}

module.exports = { parseFilters, buildFilter };
