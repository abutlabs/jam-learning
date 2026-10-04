/**
 * jam-learning: the page code both courses share (course data, landing tracks, offline).
 *
 * Philosophy: Simple not easy. No frameworks, just clarity.
 */

// ============================================
// Course Structure (single source of truth: data/course.json)
// ============================================

let COURSE_DATA = { graypaper: '', conformance: {}, tracks: [] };

const courseReady = fetch('data/course.json')
    .then(r => {
        if (!r.ok) throw new Error(`course.json: HTTP ${r.status}`);
        return r.json();
    })
    .then(data => {
        COURSE_DATA = data;
        return data;
    })
    .catch(err => {
        console.error('Failed to load course manifest:', err);
        return COURSE_DATA;
    });

// ============================================
// Progress Tracking
// ============================================

function getProgress() {
    const saved = localStorage.getItem('progress');
    return saved ? JSON.parse(saved) : { completed: [] };
}

function saveProgress(progress) {
    localStorage.setItem('progress', JSON.stringify(progress));
}

function markLessonComplete(lessonPath) {
    const progress = getProgress();
    if (!progress.completed.includes(lessonPath)) {
        progress.completed.push(lessonPath);
        saveProgress(progress);
    }
}

function isLessonComplete(lessonPath) {
    return getProgress().completed.includes(lessonPath);
}

/** All lessons of a track as flat [{path, title}] (sections flattened). */
function trackLessons(track) {
    const out = [];
    if (track.sections) {
        for (const section of track.sections) {
            for (const lesson of section.lessons) {
                out.push({ path: `${track.id}/${lesson.id}`, title: lesson.title });
            }
        }
    }
    if (track.lessons) {
        for (const lesson of track.lessons) {
            out.push({ path: `${track.id}/${lesson.id}`, title: lesson.title });
        }
    }
    return out;
}

/** Per-track progress: {done, total}. */
function getTrackProgress(track) {
    const lessons = trackLessons(track);
    const done = lessons.filter(l => isLessonComplete(l.path)).length;
    return { done, total: lessons.length };
}

// ============================================
// Navigation Helpers
// ============================================

function getLessonPath() {
    const params = new URLSearchParams(window.location.search);
    return params.get('lesson') || '00-introduction/welcome';
}

function findLessonInfo(lessonPath) {
    const [trackId, lessonId] = lessonPath.split('/');

    for (const track of COURSE_DATA.tracks) {
        if (track.id === trackId) {
            // Handle tracks with sections (like Graypaper Lectures)
            if (track.sections) {
                for (const section of track.sections) {
                    for (let i = 0; i < section.lessons.length; i++) {
                        if (section.lessons[i].id === lessonId) {
                            return {
                                track,
                                section,
                                lesson: section.lessons[i],
                                index: i,
                                prev: i > 0 ? section.lessons[i - 1] : null,
                                next: i < section.lessons.length - 1 ? section.lessons[i + 1] : null
                            };
                        }
                    }
                }
            }
            // Handle regular tracks with flat lessons
            if (track.lessons) {
                for (let i = 0; i < track.lessons.length; i++) {
                    if (track.lessons[i].id === lessonId) {
                        return {
                            track,
                            lesson: track.lessons[i],
                            index: i,
                            prev: i > 0 ? track.lessons[i - 1] : null,
                            next: i < track.lessons.length - 1 ? track.lessons[i + 1] : null
                        };
                    }
                }
            }
        }
    }
    return null;
}

function getAdjacentLesson(lessonPath, direction) {
    const allLessons = [];

    for (const track of COURSE_DATA.tracks) {
        for (const lesson of trackLessons(track)) {
            allLessons.push({ ...lesson, track: track.title });
        }
    }

    const currentIndex = allLessons.findIndex(l => l.path === lessonPath);

    if (direction === 'prev' && currentIndex > 0) {
        return allLessons[currentIndex - 1];
    }
    if (direction === 'next' && currentIndex < allLessons.length - 1) {
        return allLessons[currentIndex + 1];
    }
    return null;
}

// ============================================
// Landing Page Rendering (index.html)
// ============================================

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderTrackCard(track) {
    const lessons = trackLessons(track);
    const { done, total } = getTrackProgress(track);
    const progressLabel = done > 0 ? ` · ${done}/${total} complete` : '';
    const qualifier = track.qualifier ? ` · ${track.qualifier}` : '';
    const number = track.number || '';

    // For sectioned tracks, link section heads instead of all 50 lessons
    let lessonLinks;
    if (track.sections) {
        lessonLinks = track.sections.map(section => {
            const first = section.lessons[0];
            return `<a href="lesson.html?lesson=${track.id}/${first.id}">${escapeHtml(section.title)}</a>`;
        }).join('\n');
    } else {
        lessonLinks = lessons.map(l =>
            `<a href="lesson.html?lesson=${l.path}">${escapeHtml(l.title)}</a>`
        ).join('\n');
    }

    return `
        <div class="track${track.elective ? ' preliminary' : ''}" data-track="${number}">
            <div class="track-header">
                <span class="track-number">${escapeHtml(number)}</span>
                <h3>${escapeHtml(track.title)}</h3>
                <span class="track-status">${total} lessons${qualifier}${progressLabel}</span>
            </div>
            <p>${escapeHtml(track.description || '')}</p>
            <div class="track-lessons">
                ${lessonLinks}
            </div>
        </div>
    `;
}

function renderLandingTracks() {
    const mainEl = document.getElementById('tracks-main');
    const electiveEl = document.getElementById('tracks-elective');
    if (!mainEl && !electiveEl) return;

    const landingTracks = COURSE_DATA.tracks.filter(t => t.landing !== false);
    const main = landingTracks.filter(t => !t.elective);
    const electives = landingTracks.filter(t => t.elective);

    if (mainEl) mainEl.innerHTML = main.map(renderTrackCard).join('\n');
    if (electiveEl) electiveEl.innerHTML = electives.map(renderTrackCard).join('\n');

    // Conformance proof banner numbers
    const conf = COURSE_DATA.conformance || {};
    document.querySelectorAll('[data-conformance]').forEach(el => {
        const key = el.getAttribute('data-conformance');
        if (conf[key] !== undefined) el.textContent = conf[key];
    });
    document.querySelectorAll('[data-graypaper]').forEach(el => {
        if (COURSE_DATA.graypaper) el.textContent = `v${COURSE_DATA.graypaper}`;
    });
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Landing page tracks (no-op on other pages); the theme and the top bar are nav.js
    courseReady.then(renderLandingTracks).then(() => {
        // The tracks render after the browser has jumped to a #anchor and push the sections
        // below them down (lasair/index.html#labs): land on the anchor again.
        const target = location.hash && document.getElementById(location.hash.slice(1));
        if (target) target.scrollIntoView({ behavior: 'instant' });
    });
});

// ============================================
// PWA: service worker (offline + installable)
// ============================================

// only a section that ships a service worker declares a web-app manifest (lasair's offline mode)
if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]')) {
    window.addEventListener('load', () => {
        // A new deploy's worker takes control: reload once so the page runs the new files.
        let reloaded = false;
        const hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (hadController && !reloaded) { reloaded = true; window.location.reload(); }
        });
        navigator.serviceWorker.register('sw.js').then((reg) => {
            reg.update().catch(() => {});
            // Ask the active worker to re-precache the lessons (it does so at most once a day).
            if (reg.active) reg.active.postMessage('refresh-lessons');
        }).catch((err) => console.warn('service worker registration failed:', err));
    });
}

// ============================================
// Symbol tooltips: every Greek letter explains itself (tap or hover)
// ============================================
// Names follow the Gray Paper 0.8.0 preamble. Tap a symbol on a phone to see it.

const SYMBOLS = {
    'σ': 'σ (sigma): the whole chain state',
    'α': 'α (alpha): authorizer pool, per core',
    'β': 'β (beta): recent history of the last 8 blocks',
    'γ': 'γ (gamma): Safrole state (tickets, next validators, sealer order)',
    'δ': 'δ (delta): service accounts (like Ethereum contract accounts)',
    'η': 'η (eta): entropy pool (on-chain randomness)',
    'θ': 'θ (theta): this block\'s accumulation outputs',
    'ι': 'ι (iota): staging validator keys, queued for the future',
    'κ': 'κ (kappa): active validator set, this epoch',
    'λ': 'λ (lambda): previous epoch\'s validator set',
    'ρ': 'ρ (rho): pending work-report per core, waiting for availability',
    'τ': 'τ (tau): the current timeslot (6-second slot number)',
    'φ': 'φ (phi): authorizer queue, per core',
    'χ': 'χ (chi): privileged services (manager, assigners, ...)',
    'ψ': 'ψ (psi): disputes record (good, bad, wonky reports; offenders)',
    'π': 'π (pi): activity statistics',
    'ω': 'ω (omega): ready queue, reports waiting on dependencies',
    'ξ': 'ξ (xi): recently accumulated work-package hashes',
    'Υ': 'Υ (upsilon): the block state-transition function, σ\' = Υ(σ, B)',
    'Ψ': 'Ψ (psi): a PVM run. Ψ_I is-authorized, Ψ_R refine, Ψ_A accumulate',
};
const SYMBOL_RE = new RegExp('[' + Object.keys(SYMBOLS).join('') + ']', 'g');
// Buttons are skipped: tapping a symbol inside an answer option must select the option.
const SYMBOL_SKIP = /^(PRE|CODE|SCRIPT|STYLE|SVG|TEXTAREA|SELECT|OPTION|BUTTON|A)$/;

function annotateSymbols(root) {
    if (!root || !root.ownerDocument) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(n) {
            for (let p = n.parentNode; p && p !== root.parentNode; p = p.parentNode) {
                if (p.nodeType === 1 && (SYMBOL_SKIP.test(p.nodeName.toUpperCase()) || p.classList.contains('sym'))) return NodeFilter.FILTER_REJECT;
            }
            SYMBOL_RE.lastIndex = 0;
            return SYMBOL_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
        const frag = document.createDocumentFragment();
        let last = 0;
        const text = n.nodeValue;
        text.replace(SYMBOL_RE, (ch, i) => {
            if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)));
            const span = document.createElement('span');
            span.className = 'sym';
            span.tabIndex = 0;
            span.dataset.tip = SYMBOLS[ch];
            span.textContent = ch;
            frag.appendChild(span);
            last = i + 1;
            return ch;
        });
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        n.parentNode.replaceChild(frag, n);
    }
}

// Watch the lesson body and the Exam Room cards; annotate whatever gets rendered.
function watchSymbols() {
    const targets = ['lesson-body', 'flash-card', 'mock-card', 'mock-result']
        .map((id) => document.getElementById(id)).filter(Boolean);
    let pending = false;
    const run = () => { pending = false; targets.forEach(annotateSymbols); };
    const obs = new MutationObserver(() => { if (!pending) { pending = true; setTimeout(run, 0); } }); // not rAF: paused in background tabs
    targets.forEach((t) => obs.observe(t, { childList: true, subtree: true }));
    run();
}
document.addEventListener('DOMContentLoaded', watchSymbols);

// Export for use in other scripts
window.LearningLasair = {
    // Live accessor: COURSE_DATA is reassigned after fetch
    get COURSE_STRUCTURE() { return COURSE_DATA; },
    ready: courseReady,
    getLessonPath,
    findLessonInfo,
    getAdjacentLesson,
    markLessonComplete,
    isLessonComplete,
    getTrackProgress,
    trackLessons,
    annotateSymbols,
    SYMBOLS
};
