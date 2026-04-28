// fireice-tracker-worker.js
// Cloudflare Worker that aggregates ICE tracking data for the fireice.info heatmap.
//
// Returns: { byState: { XX: {...} }, generatedAt, sources, coverage }
//
// Strategy: ONE Google News RSS query PER STATE (50 parallel fetches), so every
// state gets real, state-specific news coverage instead of being lost in a single
// nationwide query. Plus hardcoded baseline data so no state is ever empty.
//
// Each byState entry has:
//   newsCount7   - news items in last 7  days
//   newsCount30  - news items in last 30 days
//   newsCount90  - news items in last 90 days
//   headlines    - up to 8 recent items: { title, url, source, date }
//   facilities   - ICE detention facility count (DHS public data)
//   fieldOffice  - ICE ERO field office covering this state
//   baselineFY24 - FY24 admin arrests baseline (thousands, ICE ERO annual report)
//
// Deploy: paste into Cloudflare Worker editor → Save and Deploy.
// On fireice.info, run in browser console:
//   localStorage.setItem('iceWorkerUrl', 'https://YOUR-WORKER.workers.dev/');
//   location.reload();

// =============================================================
// HARDCODED PER-STATE BASELINE — every state always populated
// =============================================================
// FY24 admin arrests by AOR, allocated to states. Source: ICE ERO FY24 Annual
// Report + TRAC Immigration tabulations. Values are thousands of arrests/year.
const BASELINE_FY24 = {
    TX: 32, CA: 14, FL: 13, NY: 9.5, IL: 7,  GA: 6.5, AZ: 5.5, VA: 4.8,
    NJ: 4.2, NC: 3.8, PA: 3.6, MD: 3.2, MA: 3.0, WA: 2.8, OH: 2.6, MI: 2.4,
    CO: 2.2, NV: 2.1, TN: 2.0, IN: 1.9, MN: 1.8, OR: 1.7, WI: 1.6, MO: 1.5,
    CT: 1.4, OK: 1.3, KY: 1.2, SC: 1.4, LA: 1.5, AL: 1.2, AR: 1.0, KS: 1.1,
    UT: 1.0, IA: 0.9, NM: 1.2, MS: 0.7, NH: 0.5, RI: 0.6, DE: 0.5, ME: 0.4,
    HI: 0.4, MT: 0.4, ID: 0.6, ND: 0.3, SD: 0.3, NE: 0.7, WY: 0.2, AK: 0.2,
    VT: 0.2, WV: 0.4, DC: 0.6
};

// ICE ERO Field Office + detention facility counts (DHS public data).
const STATE_PRESENCE = {
    AL: { fullName: 'Alabama',         fieldOffice: 'New Orleans',                          facilities: 4  },
    AK: { fullName: 'Alaska',          fieldOffice: 'Seattle',                              facilities: 0  },
    AZ: { fullName: 'Arizona',         fieldOffice: 'Phoenix',                              facilities: 12 },
    AR: { fullName: 'Arkansas',        fieldOffice: 'New Orleans',                          facilities: 1  },
    CA: { fullName: 'California',      fieldOffice: 'Los Angeles + San Francisco',          facilities: 10 },
    CO: { fullName: 'Colorado',        fieldOffice: 'Denver',                               facilities: 2  },
    CT: { fullName: 'Connecticut',     fieldOffice: 'Boston',                               facilities: 1  },
    DE: { fullName: 'Delaware',        fieldOffice: 'Philadelphia',                         facilities: 0  },
    DC: { fullName: 'District of Columbia', fieldOffice: 'Washington',                      facilities: 0  },
    FL: { fullName: 'Florida',         fieldOffice: 'Miami',                                facilities: 5  },
    GA: { fullName: 'Georgia',         fieldOffice: 'Atlanta',                              facilities: 5  },
    HI: { fullName: 'Hawaii',          fieldOffice: 'Los Angeles',                          facilities: 1  },
    ID: { fullName: 'Idaho',           fieldOffice: 'Salt Lake City',                       facilities: 1  },
    IL: { fullName: 'Illinois',        fieldOffice: 'Chicago',                              facilities: 3  },
    IN: { fullName: 'Indiana',         fieldOffice: 'Chicago',                              facilities: 2  },
    IA: { fullName: 'Iowa',            fieldOffice: 'Saint Paul',                           facilities: 1  },
    KS: { fullName: 'Kansas',          fieldOffice: 'Chicago',                              facilities: 1  },
    KY: { fullName: 'Kentucky',        fieldOffice: 'Chicago',                              facilities: 2  },
    LA: { fullName: 'Louisiana',       fieldOffice: 'New Orleans',                          facilities: 8  },
    ME: { fullName: 'Maine',           fieldOffice: 'Boston',                               facilities: 1  },
    MD: { fullName: 'Maryland',        fieldOffice: 'Baltimore',                            facilities: 2  },
    MA: { fullName: 'Massachusetts',   fieldOffice: 'Boston',                               facilities: 2  },
    MI: { fullName: 'Michigan',        fieldOffice: 'Detroit',                              facilities: 2  },
    MN: { fullName: 'Minnesota',       fieldOffice: 'Saint Paul',                           facilities: 1  },
    MS: { fullName: 'Mississippi',     fieldOffice: 'New Orleans',                          facilities: 1  },
    MO: { fullName: 'Missouri',        fieldOffice: 'Chicago',                              facilities: 1  },
    MT: { fullName: 'Montana',         fieldOffice: 'Salt Lake City',                       facilities: 1  },
    NE: { fullName: 'Nebraska',        fieldOffice: 'Saint Paul',                           facilities: 1  },
    NV: { fullName: 'Nevada',          fieldOffice: 'Salt Lake City',                       facilities: 2  },
    NH: { fullName: 'New Hampshire',   fieldOffice: 'Boston',                               facilities: 1  },
    NJ: { fullName: 'New Jersey',      fieldOffice: 'Newark',                               facilities: 4  },
    NM: { fullName: 'New Mexico',      fieldOffice: 'El Paso',                              facilities: 4  },
    NY: { fullName: 'New York',        fieldOffice: 'New York City + Buffalo',              facilities: 6  },
    NC: { fullName: 'North Carolina',  fieldOffice: 'Atlanta',                              facilities: 3  },
    ND: { fullName: 'North Dakota',    fieldOffice: 'Saint Paul',                           facilities: 1  },
    OH: { fullName: 'Ohio',            fieldOffice: 'Detroit',                              facilities: 4  },
    OK: { fullName: 'Oklahoma',        fieldOffice: 'Dallas',                               facilities: 2  },
    OR: { fullName: 'Oregon',          fieldOffice: 'Seattle',                              facilities: 1  },
    PA: { fullName: 'Pennsylvania',    fieldOffice: 'Philadelphia',                         facilities: 4  },
    RI: { fullName: 'Rhode Island',    fieldOffice: 'Boston',                               facilities: 0  },
    SC: { fullName: 'South Carolina',  fieldOffice: 'Atlanta',                              facilities: 2  },
    SD: { fullName: 'South Dakota',    fieldOffice: 'Saint Paul',                           facilities: 1  },
    TN: { fullName: 'Tennessee',       fieldOffice: 'New Orleans',                          facilities: 4  },
    TX: { fullName: 'Texas',           fieldOffice: 'Dallas + El Paso + Houston + San Antonio', facilities: 30 },
    UT: { fullName: 'Utah',            fieldOffice: 'Salt Lake City',                       facilities: 1  },
    VT: { fullName: 'Vermont',         fieldOffice: 'Boston',                               facilities: 0  },
    VA: { fullName: 'Virginia',        fieldOffice: 'Washington',                           facilities: 4  },
    WA: { fullName: 'Washington',      fieldOffice: 'Seattle',                              facilities: 1  },
    WV: { fullName: 'West Virginia',   fieldOffice: 'Baltimore',                            facilities: 1  },
    WI: { fullName: 'Wisconsin',       fieldOffice: 'Chicago',                              facilities: 1  },
    WY: { fullName: 'Wyoming',         fieldOffice: 'Denver',                               facilities: 0  }
};

const ALL_STATE_CODES = Object.keys(STATE_PRESENCE);
const CACHE_TTL = 60 * 30; // 30 min — full result cache
const REQ_HEADERS = {
    'User-Agent': 'fireice-tracker/3.0 (+https://fireice.info)',
    'Accept': 'application/rss+xml,application/xml,text/xml,application/json,*/*'
};

// =============================================================
// PER-STATE Google News RSS query
// =============================================================
// One query per state, querying the full state name + ICE keywords. Each query
// returns up to ~100 items SPECIFIC to that state — far better than splitting
// a single nationwide query 50 ways.
function googleNewsUrlForState(stateName) {
    const q = `ICE "${stateName}" (arrest OR raid OR detention OR enforcement OR ERO OR deportation)`;
    return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

async function fetchStateNews(code, stateName) {
    try {
        const res = await fetch(googleNewsUrlForState(stateName), {
            headers: REQ_HEADERS,
            cf: { cacheTtl: 1200, cacheEverything: true }
        });
        if (!res.ok) return { code, items: [], error: `HTTP ${res.status}` };
        const xml = await res.text();
        return { code, items: parseRSS(xml), error: null };
    } catch (e) {
        return { code, items: [], error: e.message };
    }
}

function parseRSS(xml) {
    const items = [];
    const itemRx = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let m;
    while ((m = itemRx.exec(xml)) !== null) {
        const block = m[1];
        const title = (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [,''])[1];
        const link = (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [,''])[1];
        const pubDate = (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) || [,''])[1];
        const source = (block.match(/<source[^>]*>([\s\S]*?)<\/source>/i) || [,''])[1];
        const cleanTitle = decodeHtml(title.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim());
        const cleanLink = link.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        const cleanSource = decodeHtml(source.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim());
        if (!cleanTitle || !cleanLink) continue;
        const dt = pubDate ? new Date(pubDate.trim()) : new Date();
        if (isNaN(dt.getTime())) continue;
        items.push({
            title: cleanTitle,
            url: cleanLink,
            source: cleanSource || 'Google News',
            date: dt.toISOString()
        });
    }
    return items;
}

function decodeHtml(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
            .replace(/&nbsp;/g, ' ');
}

// =============================================================
// AGGREGATE — every state always populated
// =============================================================
async function aggregate() {
    // 50 parallel state-specific RSS fetches. At Cloudflare's 50-subrequest free
    // tier limit, but the per-state cf:cacheTtl above + the wrapping response
    // cache keep this from being a hot path.
    const results = await Promise.all(
        ALL_STATE_CODES.map(code => fetchStateNews(code, STATE_PRESENCE[code].fullName))
    );

    const now = Date.now();
    const DAY = 86400000;
    let totalItems = 0;
    let statesWithNews = 0;

    const byState = {};
    for (const { code, items } of results) {
        const presence = STATE_PRESENCE[code];
        let count7 = 0, count30 = 0, count90 = 0;
        const recent = [];
        // Sort newest first, then bucket and pick headlines
        const sorted = items
            .filter(it => {
                const age = now - new Date(it.date).getTime();
                return age >= 0 && age <= 90 * DAY;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        for (const it of sorted) {
            const ageMs = now - new Date(it.date).getTime();
            if (ageMs <= 7  * DAY) count7++;
            if (ageMs <= 30 * DAY) count30++;
            count90++;
            if (recent.length < 8) recent.push(it);
        }
        if (count90 > 0) statesWithNews++;
        totalItems += count90;

        byState[code] = {
            // Single number for back-compat with map shading
            count: count90,
            // Detailed breakdown
            newsCount7:   count7,
            newsCount30:  count30,
            newsCount90:  count90,
            headlines:    recent,
            facilities:   presence.facilities,
            fieldOffice:  presence.fieldOffice,
            baselineFY24: BASELINE_FY24[code] || 0,
            stateName:    presence.fullName
        };
    }

    return {
        byState,
        sources: {
            googleNews: {
                ok: totalItems > 0,
                totalItems,
                statesWithNews,
                strategy: 'per-state RSS query (50 endpoints)'
            }
        },
        coverage: {
            totalStates: ALL_STATE_CODES.length,
            statesWithLiveNews: statesWithNews,
            totalNewsItems: totalItems
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

        const url = new URL(request.url);
        const cache = caches.default;
        const cacheKey = new Request('https://fireice-tracker-cache.local/v3', request);

        if (!url.searchParams.has('refresh')) {
            const cached = await cache.match(cacheKey);
            if (cached) {
                const body = await cached.text();
                return new Response(body, {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': `public, max-age=${CACHE_TTL}`,
                        'X-Cache': 'HIT'
                    }
                });
            }
        }

        const data = await aggregate();
        const body = JSON.stringify(data, null, 2);
        const response = new Response(body, {
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
