// ============================================
// LOCATION API (CountriesNow - Free, no API key)
// ============================================
const BASE_URL = 'https://countriesnow.space/api/v0.1';

// In-memory cache
const cache = {
    countries: null,
    states: {},
    cities: {},
};

// ============================================
// RAW API CALLS
// ============================================
async function fetchCountries() {
    const res = await fetch(`${BASE_URL}/countries`);
    const data = await res.json();
    if (data.error) throw new Error(data.msg);
    return data.data;
}

async function fetchStates(country) {
    const res = await fetch(`${BASE_URL}/countries/states`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.msg);
    return data.data.states;
}

async function fetchCities(country, state) {
    const res = await fetch(`${BASE_URL}/countries/state/cities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.msg);
    return data.data;
}

// ============================================
// CACHED VERSIONS
// ============================================
export async function getCountriesCached() {
    if (cache.countries) return cache.countries;
    const countries = await fetchCountries();
    const sorted = [...countries].sort((a, b) =>
        a.country.localeCompare(b.country)
    );
    cache.countries = sorted;
    return sorted;
}

export async function getStatesCached(country) {
    if (cache.states[country]) return cache.states[country];
    const states = await fetchStates(country);
    const sorted = [...states].sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    cache.states[country] = sorted;
    return sorted;
}

export async function getCitiesCached(country, state) {
    const key = `${country}::${state}`;
    if (cache.cities[key]) return cache.cities[key];
    const cities = await fetchCities(country, state);
    const sorted = [...cities].sort();
    cache.cities[key] = sorted;
    return sorted;
}