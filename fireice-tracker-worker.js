// fireice-tracker-worker.js
// Cloudflare Worker that aggregates ICE tracking data from multiple sources
// Returns { byState, sources, generatedAt } JSON for the fireice.info heatmap.
//
// Deploy: paste this into your Cloudflare Worker editor, click Save and Deploy.
// Then on fireice.info, run in the browser console:
//   localStorage.setItem('iceWorkerUrl', 'https://YOUR-WORKER.workers.dev/');
//   location.reload();

const STATE_NAMES_TO_CODE = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
    'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
    'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA',
    'kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
    'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO',
    'montana':'MT','nebraska':'NE','nevada':'NV','new hampshire':'NH','new jersey':'NJ',
    'new mexico':'NM','new york':'NY','north carolina':'NC','north dakota':'ND','ohio':'OH',
    'oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
    'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT',
    'virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
    'district of columbia':'DC'
};
const CACHE_TTL = 60 * 60; // 1 hour
const REQ_HEADERS = {
    'User-Agent': 'fireice-tracker/1.0 (https://fireice.info aggregator)',
    'Accept': 'text/html,application/json,application/xml;q=0.9,*/*;q=0.8'
};

// =============================================================
// 1. TRAC Immigration — monthly state-level ICE arrest tables
// =============================================================
async function fetchTRAC() {
    const urls = [
        'https://trac.syr.edu/immigration/quickfacts/',
        'https://trac.syr.edu/phptools/immigration/arrest/',
        'https://tracreports.org/whatsnew/'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { headers: REQ_HEADERS, cf: { cacheTtl: 1800 } });
            if (!res.ok) continue;
            const html = await res.text();
            const byState = parseStateTablesFromHTML(html);
            if (Object.keys(byState).length > 5) {
                return { byState, source: url, count: Object.keys(byState).length };
            }
        } catch (e) {}
    }
    return { byState: {}, error: 'TRAC unreachable / no parseable state table' };
}

// Parse any HTML page looking for state-named rows with numbers next to them.
// Works for TRAC, ICE.gov, and similar gov-style HTML tables.
function parseStateTablesFromHTML(html) {
    const byState = {};
    const lc = html.toLowerCase();
    const rowRx = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRx.exec(html)) !== null) {
        const cells = (row[1].match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [])
            .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());
        if (cells.length < 2) continue;
        const stateName = cells[0].toLowerCase();
        const code = STATE_NAMES_TO_CODE[stateName];
        if (!code) continue;
        for (let i = 1; i < cells.length; i++) {
            const num = parseInt(cells[i].replace(/[^\d]/g, ''), 10);
            if (num > 0 && num < 10_000_000) { byState[code] = num; break; }
        }
    }
    return byState;
}

// =============================================================
// 2. ICE.gov — detention facility list, count per state
// =============================================================
async function fetchICEGov() {
    try {
        const res = await fetch('https://www.ice.gov/detention-facilities', { headers: REQ_HEADERS });
        if (!res.ok) return { byState: {}, error: 'HTTP ' + res.status };
        const html = await res.text();
        const byState = {};
        // Detention facility addresses end in ", XX 12345" — count facilities per state
        const matches = html.match(/,\s*([A-Z]{2})\s+\d{5}/g) || [];
        for (const m of matches) {
            const code = m.match(/,\s*([A-Z]{2})/)[1];
            if (STATE_NAMES_TO_CODE[Object.keys(STATE_NAMES_TO_CODE).find(k => STATE_NAMES_TO_CODE[k] === code)] !== undefined) {
                byState[code] = (byState[code] || 0) + 1;
            }
        }
        return { byState, count: Object.keys(byState).length, source: 'ice.gov/detention-facilities' };
    } catch (e) {
        return { byState: {}, error: e.message };
    }
}

// =============================================================
// 3. Deportation Data Project — UCLA/Berkeley FOIA dataset on GitHub
// =============================================================
async function fetchDDP() {
    // Their data repos publish CSVs. Try the canonical paths; fall back to GitHub search.
    const urls = [
        'https://raw.githubusercontent.com/uclalaw/deportation-data/main/data/state_summary.csv',
        'https://raw.githubusercontent.com/UCLA-Law/deportation-data-project/main/state-summary.csv',
        'https://raw.githubusercontent.com/deportation-data-project/data/main/latest_state.csv'
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const csv = await res.text();
            const byState = parseCSVStateColumn(csv);
            if (Object.keys(byState).length > 0) {
                return { byState, source: url, count: Object.keys(byState).length };
            }
        } catch (e) {}
    }
    return { byState: {}, error: 'DDP CSV not found at known paths — repo URL may have changed' };
}

function parseCSVStateColumn(csv) {
    const byState = {};
    const lines = csv.split(/\r?\n/);
    if (lines.length < 2) return byState;
    const header = lines[0].toLowerCase().split(',').map(c => c.replace(/"/g, '').trim());
    const stateIdx = header.findIndex(c => /^state(\s|_|$)|^st$/.test(c));
    const numIdx = header.findIndex(c => /arrest|count|total|removal|deportation/i.test(c));
    if (stateIdx < 0 || numIdx < 0) return byState;
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
        if (cells.length <= Math.max(stateIdx, numIdx)) continue;
        const sn = cells[stateIdx].toLowerCase();
        const code = STATE_NAMES_TO_CODE[sn] || (sn.length === 2 ? sn.toUpperCase() : null);
        if (!code) continue;
        const num = parseInt(cells[numIdx].replace(/[^\d]/g, ''), 10);
        if (num > 0) byState[code] = (byState[code] || 0) + num;
    }
    return byState;
}

// =============================================================
// 4. iceinmyarea.org — community sighting pin data
// =============================================================
async function fetchIceInMyArea() {
    // Try common API patterns first; fall back to scraping the homepage HTML
    const apiUrls = [
        'https://www.iceinmyarea.org/api/sightings',
        'https://www.iceinmyarea.org/api/v1/pins',
        'https://www.iceinmyarea.org/data/sightings.json',
        'https://www.iceinmyarea.org/sightings.json'
    ];
    for (const url of apiUrls) {
        try {
            const res = await fetch(url, { headers: REQ_HEADERS });
            if (res.ok && res.headers.get('content-type')?.includes('json')) {
                const data = await res.json();
                const list = Array.isArray(data) ? data : (data.sightings || data.pins || data.data || []);
                const byState = {};
                for (const pin of list) {
                    const code = (pin.state || pin.region || pin.st || '').toUpperCase().slice(0, 2);
                    if (code && /^[A-Z]{2}$/.test(code)) byState[code] = (byState[code] || 0) + 1;
                }
                if (Object.keys(byState).length > 0) {
                    return { byState, count: Object.keys(byState).length, source: url };
                }
            }
        } catch (e) {}
    }
    // Last resort: scrape homepage for embedded JSON or state mentions
    try {
        const res = await fetch('https://www.iceinmyarea.org/', { headers: REQ_HEADERS });
        if (res.ok) {
            const html = await res.text();
            // Look for "state": "XX" patterns in embedded JS data
            const byState = {};
            const stateRx = /["']state["']\s*:\s*["']([A-Z]{2})["']/g;
            let m;
            while ((m = stateRx.exec(html)) !== null) {
                byState[m[1]] = (byState[m[1]] || 0) + 1;
            }
            if (Object.keys(byState).length > 0) {
                return { byState, count: Object.keys(byState).length, source: 'iceinmyarea.org (scraped)' };
            }
        }
    } catch (e) {}
    return { byState: {}, error: 'iceinmyarea.org no parseable data exposed' };
}

// =============================================================
// Aggregate everything into one byState response
// =============================================================
async function aggregate() {
    const [trac, iceGov, ddp, ima] = await Promise.all([
        fetchTRAC().catch(e => ({ byState: {}, error: e.message })),
        fetchICEGov().catch(e => ({ byState: {}, error: e.message })),
        fetchDDP().catch(e => ({ byState: {}, error: e.message })),
        fetchIceInMyArea().catch(e => ({ byState: {}, error: e.message }))
    ]);
    const codes = new Set([
        ...Object.keys(trac.byState || {}),
        ...Object.keys(iceGov.byState || {}),
        ...Object.keys(ddp.byState || {}),
        ...Object.keys(ima.byState || {})
    ]);
    const byState = {};
    for (const code of codes) {
        byState[code] = {
            tracArrests:   trac.byState[code]   || 0,
            iceFacilities: iceGov.byState[code] || 0,
            ddpArrests:    ddp.byState[code]    || 0,
            sightings:     ima.byState[code]    || 0
        };
    }
    return {
        byState,
        sources: {
            trac:        { count: trac.count   || 0, error: trac.error   || null, source: trac.source   || null },
            iceGov:      { count: iceGov.count || 0, error: iceGov.error || null, source: iceGov.source || null },
            ddp:         { count: ddp.count    || 0, error: ddp.error    || null, source: ddp.source    || null },
            iceinmyarea: { count: ima.count    || 0, error: ima.error    || null, source: ima.source    || null }
        },
        generatedAt: new Date().toISOString()
    };
}

// =============================================================
// Worker entry point
// =============================================================
export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Max-Age': '86400'
                }
            });
        }
        const cache = caches.default;
        const cacheKey = new Request('https://fireice-tracker-cache.local/v1', request);
        let cached = await cache.match(cacheKey);
        if (cached) {
            return new Response(cached.body, {
                headers: {
                    ...Object.fromEntries(cached.headers),
                    'X-Cache': 'HIT'
                }
            });
        }
        const data = await aggregate();
        const response = new Response(JSON.stringify(data, null, 2), {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': `public, max-age=${CACHE_TTL}`,
                'Access-Control-Allow-Origin': '*',
                'X-Cache': 'MISS'
            }
        });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
        return response;
    }
};
