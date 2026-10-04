export function DateFilters({ from, to, onChange }) {
    return (
        <div className="flex flex-wrap items-end gap-3 mt-3">
            <label className="text-xs text-ink-600">From date
                <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} className="input mt-1" />
            </label>
            <label className="text-xs text-ink-600">To date
                <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} className="input mt-1" />
            </label>
            {(from || to) && <button type="button" onClick={() => onChange('', '')} className="btn btn-secondary">Clear dates</button>}
        </div>
    );
}

export function DocumentPagination({ page, total, loading, onChange }) {
    const pages = Math.max(1, Math.ceil(total / 10));
    return (
        <nav aria-label="Document pagination" className="flex flex-wrap items-center justify-between gap-3 mt-4 text-sm">
            <span>{total ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} of ${total}` : '0 results'} · 10 rows per page</span>
            <div className="flex items-center gap-3">
                <button disabled={loading || page <= 1} onClick={() => onChange(page - 1)} className="btn btn-secondary">Previous</button>
                <span>Page {page} of {pages}</span>
                <button disabled={loading || page >= pages} onClick={() => onChange(page + 1)} className="btn btn-secondary">Next</button>
            </div>
        </nav>
    );
}
