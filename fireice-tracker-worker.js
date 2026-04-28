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
//   headlines    - all recent items in 90d window: { title, url, source, date }
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
// Cloudflare Workers Free plan caps each invocation at 50 subrequests. We use:
//   48 per-state Google News queries (skip AK/WY — lowest-baseline, smallest
//   population; still fully populated from Reddit + ICE.gov classification)
//   + 1 Reddit r/ICESightings JSON
//   + 1 ICE.gov news releases scrape
//   = 50 subrequests at the limit.
// Skip the 3 lowest-baseline / smallest-population states from per-state queries
// to stay under Cloudflare's 50-subrequest free-tier cap (47 + 2 Reddit + 1 ICE.gov = 50).
// They still appear in byState — populated from Reddit/ICE.gov classification when items mention them.
const SKIP_PER_STATE_QUERY = new Set(['AK', 'WY', 'VT']);
const STATE_CODES_QUERIED = ALL_STATE_CODES.filter(c => !SKIP_PER_STATE_QUERY.has(c));
const CACHE_TTL = 60 * 30; // 30 min — full result cache
const REQ_HEADERS = {
    'User-Agent': 'fireice-tracker/4.0 (+https://fireice.info)',
    'Accept': 'application/rss+xml,application/xml,text/xml,application/json,*/*'
};

// State-name + city → state-code mapping for classifying news/sighting items
// that don't have an explicit state code.
const STATE_NAME_TO_CODE = Object.fromEntries(
    ALL_STATE_CODES.map(c => [STATE_PRESENCE[c].fullName.toLowerCase(), c])
);
const CITY_TO_STATE = {
    'los angeles':'CA','san francisco':'CA','san diego':'CA','oakland':'CA','sacramento':'CA','san jose':'CA','fresno':'CA','long beach':'CA','anaheim':'CA',
    'houston':'TX','san antonio':'TX','dallas':'TX','austin':'TX','el paso':'TX','laredo':'TX','mcallen':'TX','brownsville':'TX','fort worth':'TX',
    'miami':'FL','tampa':'FL','orlando':'FL','jacksonville':'FL','fort lauderdale':'FL','homestead':'FL',
    'new york city':'NY','nyc':'NY','brooklyn':'NY','queens':'NY','bronx':'NY','manhattan':'NY','buffalo':'NY','rochester':'NY','syracuse':'NY','long island':'NY',
    'chicago':'IL','aurora':'IL','rockford':'IL','pilsen':'IL',
    'phoenix':'AZ','tucson':'AZ','mesa':'AZ','glendale':'AZ','nogales':'AZ',
    'philadelphia':'PA','pittsburgh':'PA','allentown':'PA','harrisburg':'PA',
    'atlanta':'GA','savannah':'GA','marietta':'GA',
    'charlotte':'NC','raleigh':'NC','greensboro':'NC','durham':'NC',
    'cleveland':'OH','cincinnati':'OH','toledo':'OH','akron':'OH','dayton':'OH',
    'detroit':'MI','grand rapids':'MI','ann arbor':'MI','dearborn':'MI','flint':'MI',
    'norfolk':'VA','richmond':'VA','arlington':'VA','alexandria':'VA',
    'seattle':'WA','spokane':'WA','tacoma':'WA',
    'boston':'MA','worcester':'MA','cambridge':'MA','lawrence':'MA','chelsea':'MA',
    'denver':'CO','colorado springs':'CO','boulder':'CO','aurora co':'CO',
    'baltimore':'MD','silver spring':'MD','rockville':'MD',
    'nashville':'TN','memphis':'TN','knoxville':'TN','chattanooga':'TN',
    'kansas city':'MO','st. louis':'MO','st louis':'MO',
    'milwaukee':'WI','madison':'WI','green bay':'WI',
    'minneapolis':'MN','st. paul':'MN','st paul':'MN',
    'portland':'OR','eugene':'OR','salem':'OR',
    'las vegas':'NV','henderson':'NV','reno':'NV',
    'newark':'NJ','jersey city':'NJ','paterson':'NJ','elizabeth':'NJ',
    'hartford':'CT','new haven':'CT','bridgeport':'CT','stamford':'CT',
    'indianapolis':'IN','fort wayne':'IN','south bend':'IN','gary':'IN',
    'oklahoma city':'OK','tulsa':'OK',
    'louisville':'KY','lexington':'KY',
    'birmingham':'AL','montgomery':'AL','mobile':'AL','huntsville':'AL',
    'new orleans':'LA','baton rouge':'LA','shreveport':'LA',
    'little rock':'AR','fayetteville':'AR',
    'jackson ms':'MS','gulfport':'MS',
    'omaha':'NE','lincoln':'NE',
    'wichita':'KS','topeka':'KS',
    'des moines':'IA','postville':'IA',
    'salt lake city':'UT','provo':'UT',
    'albuquerque':'NM','las cruces':'NM','santa fe':'NM',
    'boise':'ID','nampa':'ID',
    'billings':'MT','missoula':'MT',
    'fargo':'ND','bismarck':'ND',
    'sioux falls':'SD','rapid city':'SD',
    'cheyenne':'WY','casper':'WY',
    'manchester nh':'NH','nashua':'NH','concord nh':'NH',
    'burlington vt':'VT',
    'portland me':'ME','bangor':'ME','lewiston':'ME',
    'providence':'RI',
    'wilmington':'DE','dover de':'DE',
    'charleston wv':'WV','huntington wv':'WV',
    'honolulu':'HI',
    'anchorage':'AK','fairbanks':'AK','juneau':'AK',
    'washington dc':'DC','washington d.c.':'DC',
    'columbia sc':'SC','charleston sc':'SC','greenville sc':'SC'
};

// =============================================================
// PER-STATE Google News RSS query
// =============================================================
// One query per state. We include the state's major cities so articles that
// say "ICE in Denver" without naming Colorado still get caught. The state name
// is quoted only when it's multi-word (so "New York" doesn't tokenize into
// "new" + "york"). No keyword filter — most ICE-mentioning articles are
// ICE-relevant; dedup + 90-day window handle the rest, and overly tight
// keyword filters were reducing per-state counts to single digits.
const STATE_QUERY_CITIES = {
    AL: ['Birmingham','Montgomery','Mobile','Huntsville'],
    AZ: ['Phoenix','Tucson','Mesa','Nogales'],
    AR: ['Little Rock','Fort Smith','Fayetteville'],
    CA: ['Los Angeles','San Francisco','San Diego','Oakland','Sacramento','Fresno'],
    CO: ['Denver','Aurora','Boulder','Colorado Springs','Greeley'],
    CT: ['Hartford','New Haven','Bridgeport','Stamford'],
    DE: ['Wilmington','Dover'],
    DC: ['Washington DC'],
    FL: ['Miami','Tampa','Orlando','Jacksonville','Homestead','Hialeah'],
    GA: ['Atlanta','Savannah','Marietta'],
    HI: ['Honolulu'],
    ID: ['Boise','Nampa'],
    IL: ['Chicago','Aurora IL','Pilsen'],
    IN: ['Indianapolis','Fort Wayne','South Bend','Gary'],
    IA: ['Des Moines','Cedar Rapids','Postville'],
    KS: ['Wichita','Topeka','Garden City'],
    KY: ['Louisville','Lexington'],
    LA: ['New Orleans','Baton Rouge','Shreveport'],
    ME: ['Portland Maine','Bangor'],
    MD: ['Baltimore','Silver Spring','Rockville'],
    MA: ['Boston','Worcester','Cambridge','Chelsea','Lawrence'],
    MI: ['Detroit','Grand Rapids','Ann Arbor','Dearborn','Flint'],
    MN: ['Minneapolis','Saint Paul','Worthington'],
    MS: ['Jackson Mississippi','Gulfport'],
    MO: ['Kansas City Missouri','St Louis','Springfield Missouri'],
    MT: ['Billings','Missoula'],
    NE: ['Omaha','Lincoln Nebraska'],
    NV: ['Las Vegas','Reno','Henderson'],
    NH: ['Manchester NH','Nashua','Concord NH'],
    NJ: ['Newark','Jersey City','Paterson','Elizabeth NJ'],
    NM: ['Albuquerque','Las Cruces','Santa Fe'],
    NY: ['New York City','NYC','Brooklyn','Queens','Bronx','Buffalo','Long Island'],
    NC: ['Charlotte','Raleigh','Greensboro','Durham'],
    ND: ['Fargo','Bismarck'],
    OH: ['Cleveland','Cincinnati','Columbus Ohio','Toledo','Akron','Dayton'],
    OK: ['Oklahoma City','Tulsa'],
    OR: ['Portland Oregon','Eugene','Salem Oregon'],
    PA: ['Philadelphia','Pittsburgh','Allentown','Harrisburg'],
    RI: ['Providence'],
    SC: ['Charleston SC','Columbia SC','Greenville SC'],
    SD: ['Sioux Falls','Rapid City'],
    TN: ['Nashville','Memphis','Knoxville','Chattanooga'],
    TX: ['Houston','San Antonio','Dallas','Austin','El Paso','McAllen','Brownsville','Laredo'],
    UT: ['Salt Lake City','Provo'],
    VA: ['Richmond Virginia','Norfolk','Arlington Virginia','Alexandria Virginia'],
    WA: ['Seattle','Spokane','Tacoma'],
    WV: ['Charleston WV','Huntington WV'],
    WI: ['Milwaukee','Madison Wisconsin','Green Bay'],
    AK: ['Anchorage','Fairbanks'],
    VT: ['Burlington Vermont','Montpelier'],
    WY: ['Cheyenne','Casper Wyoming']
};

function googleNewsUrlForState(code, stateName) {
    const cities = STATE_QUERY_CITIES[code] || [];
    // Quote multi-word state names so Google doesn't tokenize them apart.
    const stateToken = stateName.includes(' ') ? `"${stateName}"` : stateName;
    const cityTokens = cities.map(c => c.includes(' ') ? `"${c}"` : c);
    const locationOR = [stateToken, ...cityTokens].join(' OR ');
    const q = `ICE (${locationOR})`;
    return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
}

// Wrap a fetch with a timeout so one slow source can't stall the whole aggregate.
async function fetchWithTimeout(url, opts = {}, ms = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
        return await fetch(url, { ...opts, signal: ctrl.signal });
    } finally {
        clearTimeout(t);
    }
}

async function fetchStateNews(code, stateName) {
    try {
        const res = await fetchWithTimeout(googleNewsUrlForState(code, stateName), {
            headers: REQ_HEADERS,
            cf: { cacheTtl: 1200, cacheEverything: true }
        }, 7000);
        if (!res.ok) return { code, items: [], error: `HTTP ${res.status}` };
        const xml = await res.text();
        return { code, items: parseRSS(xml).map(it => ({ ...it, state: code, sourceType: 'news' })), error: null };
    } catch (e) {
        return { code, items: [], error: e.message };
    }
}

// =============================================================
// Reddit r/ICESightings — community-reported sightings, JSON, no key
// =============================================================
async function fetchRedditSightings() {
    // 2 subreddits to fit our subrequest budget (47 states + 2 reddit + 1 ICE.gov = 50)
    const subs = ['ICESightings', 'iceraids'];
    const allPosts = [];
    const fetches = await Promise.allSettled(subs.map(sub =>
        fetchWithTimeout(`https://www.reddit.com/r/${sub}/new.json?limit=50`, {
            headers: { 'User-Agent': REQ_HEADERS['User-Agent'], 'Accept': 'application/json' }
        }, 5000).then(r => r.ok ? r.json() : null)
    ));
    for (const result of fetches) {
        if (result.status !== 'fulfilled' || !result.value) continue;
        const posts = result.value?.data?.children || [];
        for (const p of posts) {
            const d = p.data;
            if (!d || !d.title) continue;
            allPosts.push({
                title: decodeHtml(d.title),
                url: 'https://www.reddit.com' + d.permalink,
                source: `r/${d.subreddit}`,
                date: new Date(d.created_utc * 1000).toISOString(),
                _searchText: ((d.title || '') + ' ' + (d.selftext || '') + ' ' + (d.link_flair_text || '')).toLowerCase(),
                sourceType: 'sighting'
            });
        }
    }
    return allPosts;
}

// =============================================================
// ICE.gov news releases — official press statements
// =============================================================
async function fetchICEGovNews() {
    try {
        const res = await fetchWithTimeout('https://www.ice.gov/news/all', {
            headers: REQ_HEADERS,
            cf: { cacheTtl: 3600 }
        }, 7000);
        if (!res.ok) return [];
        const html = await res.text();
        const items = [];
        // ICE.gov news cards: look for <article> blocks with headline + link + date
        // Their markup varies; this is a tolerant parser that finds title/href/date triples.
        const cardRx = /<a[^>]+href="(\/news\/releases\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
        let m;
        const seen = new Set();
        while ((m = cardRx.exec(html)) !== null && items.length < 60) {
            const path = m[1];
            const title = decodeHtml(m[2].trim());
            if (!title || seen.has(path)) continue;
            seen.add(path);
            // Try to find a date near the link in the surrounding HTML
            const ctxStart = Math.max(0, m.index - 400);
            const ctxEnd = Math.min(html.length, m.index + 400);
            const context = html.slice(ctxStart, ctxEnd);
            const dateMatch = context.match(/(\w+\s+\d{1,2},\s+\d{4})/) ||
                              context.match(/(\d{4}-\d{2}-\d{2})/);
            const dt = dateMatch ? new Date(dateMatch[1]) : new Date();
            items.push({
                title,
                url: 'https://www.ice.gov' + path,
                source: 'ICE.gov',
                date: isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString(),
                _searchText: title.toLowerCase(),
                sourceType: 'official'
            });
        }
        return items;
    } catch (e) {
        return [];
    }
}

// Classify an unstated-state item to one or more state codes by scanning its text
// for state names + major-city mentions.
function classifyItemToStates(item) {
    const txt = item._searchText || (item.title + ' ' + (item.source || '')).toLowerCase();
    const found = new Set();
    for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
        if (new RegExp('\\b' + name.replace(/\s/g, '\\s') + '\\b').test(txt)) found.add(code);
    }
    for (const [city, code] of Object.entries(CITY_TO_STATE)) {
        const pattern = city.replace(/\./g, '\\.?').replace(/\s/g, '\\s+');
        if (new RegExp('\\b' + pattern + '\\b').test(txt)) found.add(code);
    }
    return [...found];
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
    // Fire all sources in parallel. Each fetch has its own timeout so one
    // slow source can't block the whole aggregate. 48 per-state queries
    // + 1 Reddit fan-out (3 subreddits) + 1 ICE.gov news = 52 max
    // (Reddit fan-out counted as 3, so 48+3+1=52). To stay under the 50
    // cap we drop the multi-subreddit Reddit fan-out to 2 subs (giving
    // 48+2+1 = 51). One state slack to ensure we never exceed:
    // skip 3 lowest-baseline states, query 47 + 2 reddit + 1 ice.gov = 50.
    const stateResults = await Promise.all(
        STATE_CODES_QUERIED.map(code =>
            fetchStateNews(code, STATE_PRESENCE[code].fullName)
        )
    );
    const [reddit, iceGovNews] = await Promise.all([
        fetchRedditSightings().catch(() => []),
        fetchICEGovNews().catch(() => [])
    ]);

    const now = Date.now();
    const DAY = 86400000;

    // Initialize an entry for every state (including AK/WY which we skip
    // querying directly — they get items via Reddit/ICE.gov classification).
    const stateBuckets = {};
    for (const code of ALL_STATE_CODES) {
        stateBuckets[code] = { count7: 0, count30: 0, count90: 0, headlines: [], allItems: [] };
    }

    // 1. Per-state Google News results (already pre-tagged with state code)
    for (const { code, items } of stateResults) {
        const bucket = stateBuckets[code];
        if (!bucket) continue;
        for (const it of items) {
            const ageMs = now - new Date(it.date).getTime();
            if (ageMs < 0 || ageMs > 90 * DAY) continue;
            bucket.allItems.push(it);
        }
    }

    // 2. Reddit sightings — classify each post to states
    for (const it of reddit) {
        const ageMs = now - new Date(it.date).getTime();
        if (ageMs < 0 || ageMs > 90 * DAY) continue;
        const codes = classifyItemToStates(it);
        for (const code of codes) {
            const bucket = stateBuckets[code];
            if (!bucket) continue;
            bucket.allItems.push({ ...it, state: code });
        }
    }

    // 3. ICE.gov official releases — classify each item to states
    for (const it of iceGovNews) {
        const ageMs = now - new Date(it.date).getTime();
        if (ageMs < 0 || ageMs > 90 * DAY) continue;
        const codes = classifyItemToStates(it);
        for (const code of codes) {
            const bucket = stateBuckets[code];
            if (!bucket) continue;
            bucket.allItems.push({ ...it, state: code });
        }
    }

    // Build per-state output: dedupe, sort, count, pick headlines
    let totalItems = 0;
    let statesWithNews = 0;
    const byState = {};
    const allItemsForFeed = [];

    for (const code of ALL_STATE_CODES) {
        const presence = STATE_PRESENCE[code];
        const bucket = stateBuckets[code];

        // Dedupe by title
        const seen = new Set();
        const deduped = [];
        for (const it of bucket.allItems) {
            const key = it.title.toLowerCase().slice(0, 90);
            if (seen.has(key)) continue;
            seen.add(key);
            deduped.push(it);
        }
        deduped.sort((a, b) => new Date(b.date) - new Date(a.date));

        let c7 = 0, c30 = 0, c90 = 0;
        for (const it of deduped) {
            const ageMs = now - new Date(it.date).getTime();
            if (ageMs <= 7  * DAY) c7++;
            if (ageMs <= 30 * DAY) c30++;
            c90++;
        }
        if (c90 > 0) statesWithNews++;
        totalItems += c90;

        byState[code] = {
            count: c90,
            newsCount7:   c7,
            newsCount30:  c30,
            newsCount90:  c90,
            // No truncation — every state ships its full 90-day deduped set so
            // state-zoom views show real totals. Colorado / smaller states were
            // capped at 4-10 entries before; that's not acceptable.
            headlines:    deduped.map(stripSearchText),
            facilities:   presence.facilities,
            fieldOffice:  presence.fieldOffice,
            baselineFY24: BASELINE_FY24[code] || 0,
            stateName:    presence.fullName
        };

        // Every per-state item is eligible for the national feed (was capped
        // at 3 per state, which made the national feed look thin). The feed
        // itself dedupes + sorts below.
        for (const it of deduped) allItemsForFeed.push(it);
    }

    // Build the global feed: dedupe, sort, cap generously so the national
    // ticker has plenty to show.
    const feedSeen = new Set();
    const feed = [];
    allItemsForFeed.sort((a, b) => new Date(b.date) - new Date(a.date));
    for (const it of allItemsForFeed) {
        const key = it.title.toLowerCase().slice(0, 90);
        if (feedSeen.has(key)) continue;
        feedSeen.add(key);
        feed.push(stripSearchText(it));
        if (feed.length >= 1000) break;
    }

    return {
        byState,
        feed,
        sources: {
            googleNews: {
                ok: stateResults.some(r => r.items.length > 0),
                strategy: `per-state RSS (${STATE_CODES_QUERIED.length} states)`,
                statesQueried: STATE_CODES_QUERIED.length
            },
            reddit: {
                ok: reddit.length > 0,
                items: reddit.length,
                source: 'r/ICESightings + r/iceraids'
            },
            iceGov: {
                ok: iceGovNews.length > 0,
                items: iceGovNews.length,
                source: 'ice.gov/news/all'
            }
        },
        coverage: {
            totalStates: ALL_STATE_CODES.length,
            statesWithLiveNews: statesWithNews,
            totalNewsItems: totalItems,
            feedItems: feed.length
        },
        generatedAt: new Date().toISOString()
    };
}

function stripSearchText(it) {
    const { _searchText, ...clean } = it;
    return clean;
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
        const cacheKey = new Request('https://fireice-tracker-cache.local/v5', request);

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
