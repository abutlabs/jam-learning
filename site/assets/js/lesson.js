/**
 * Learning Lasair - Lesson Page JavaScript
 *
 * Handles markdown loading, rendering, and navigation.
 */

// ============================================
// Markdown Configuration
// ============================================

marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
    },
    langPrefix: 'hljs language-',
    gfm: true,
    breaks: false
});

// Custom renderer for special blocks
const renderer = new marked.Renderer();

// Add copy button (and run button for OCaml) to code blocks
renderer.code = function(code, language) {
    const highlighted = language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language }).value
        : hljs.highlightAuto(code).value;

    const langLabel = language || 'code';

    // Add "Run" button only for OCaml code blocks
    const runButton = language === 'ocaml'
        ? '<button class="run-button" onclick="runInPlayground(this)">Run</button>'
        : '';

    return `
        <div class="code-block" data-language="${language || ''}">
            <div class="code-header">
                <span>${langLabel}</span>
                <div class="code-buttons">
                    ${runButton}
                    <button class="copy-button" onclick="copyCode(this)">Copy</button>
                </div>
            </div>
            <pre><code class="hljs language-${language || ''}">${highlighted}</code></pre>
        </div>
    `;
};

marked.use({ renderer });

// ============================================
// Copy Code Functionality
// ============================================

window.copyCode = function(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const text = codeBlock.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const original = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = original;
        }, 2000);
    });
};

// ============================================
// Run in Playground Functionality
// ============================================

window.runInPlayground = function(button) {
    const codeBlock = button.closest('.code-block').querySelector('code');
    const code = codeBlock.textContent;

    // Encode code as base64 for URL parameter
    const encoded = btoa(unescape(encodeURIComponent(code)));

    // Navigate to playground with code parameter
    window.location.href = `playground.html?code=${encoded}`;
};

// ============================================
// YouTube ID Extraction
// ============================================

function extractYouTubeId(url) {
    if (!url) return null;

    // Handle various YouTube URL formats:
    // - https://www.youtube.com/watch?v=VIDEO_ID
    // - https://youtu.be/VIDEO_ID
    // - https://www.youtube.com/embed/VIDEO_ID
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
        /^([a-zA-Z0-9_-]{11})$/  // Raw video ID
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    return null;
}

// ============================================
// Sidebar State (for collapsible sections)
// ============================================

function getSidebarState() {
    const saved = localStorage.getItem('sidebarState');
    return saved ? JSON.parse(saved) : { expanded: {}, scrollTop: 0 };
}

function saveSidebarState(state) {
    localStorage.setItem('sidebarState', JSON.stringify(state));
}

function saveSidebarScroll() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const state = getSidebarState();
        state.scrollTop = sidebar.scrollTop;
        saveSidebarState(state);
    }
}

function restoreSidebarScroll() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        const state = getSidebarState();
        if (state.scrollTop) {
            sidebar.scrollTop = state.scrollTop;
        }
    }
}

function toggleSection(trackId, sectionId = null) {
    const state = getSidebarState();
    const key = sectionId ? `${trackId}/${sectionId}` : trackId;

    if (!state.expanded[key]) {
        state.expanded[key] = true;
    } else {
        delete state.expanded[key];
    }

    saveSidebarState(state);
    const currentPath = window.LearningLasair.getLessonPath();
    renderSidebar(currentPath);
}

// Make toggleSection available globally
window.toggleSection = toggleSection;

// ============================================
// Sidebar Rendering
// ============================================

function renderSidebar(currentPath) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const { COURSE_STRUCTURE, isLessonComplete } = window.LearningLasair;
    const sidebarState = getSidebarState();
    let html = '';

    // Check if current lesson is in a collapsible track/section
    const [currentTrackId] = currentPath.split('/');

    for (const track of COURSE_STRUCTURE.tracks) {
        // Check if this track contains the current lesson
        const trackContainsCurrent = currentPath.startsWith(track.id + '/');

        // Handle collapsible tracks with sections
        if (track.collapsible && track.sections) {
            const trackKey = track.id;
            const isTrackExpanded = sidebarState.expanded[trackKey] || trackContainsCurrent;

            html += `
                <div class="sidebar-track sidebar-track-collapsible${isTrackExpanded ? ' expanded' : ''}">
                    <div class="sidebar-track-title sidebar-track-toggle" onclick="toggleSection('${track.id}')">
                        <span class="collapse-icon">${isTrackExpanded ? '▼' : '▶'}</span>
                        ${track.title}
                    </div>
                    <div class="sidebar-track-content${isTrackExpanded ? ' expanded' : ''}">
            `;

            for (const section of track.sections) {
                const sectionKey = `${track.id}/${section.id}`;
                // Check if section contains current lesson
                const sectionContainsCurrent = track.sections.some(s =>
                    s.id === section.id && s.lessons.some(l => `${track.id}/${l.id}` === currentPath)
                );
                const isSectionExpanded = sidebarState.expanded[sectionKey] || sectionContainsCurrent;

                html += `
                    <div class="sidebar-section${isSectionExpanded ? ' expanded' : ''}">
                        <div class="sidebar-section-title" onclick="toggleSection('${track.id}', '${section.id}')">
                            <span class="collapse-icon">${isSectionExpanded ? '▼' : '▶'}</span>
                            ${section.title}
                        </div>
                        <ul class="sidebar-lessons${isSectionExpanded ? ' expanded' : ''}">
                `;

                for (const lesson of section.lessons) {
                    const lessonPath = `${track.id}/${lesson.id}`;
                    const isActive = lessonPath === currentPath;
                    const isComplete = isLessonComplete(lessonPath);

                    let className = '';
                    if (isActive) className += ' active';
                    if (isComplete) className += ' completed';

                    html += `
                        <li>
                            <a href="lesson.html?lesson=${lessonPath}" class="${className.trim()}">
                                ${lesson.title}
                            </a>
                        </li>
                    `;
                }

                html += `
                        </ul>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }
        // Handle regular tracks with flat lessons
        else if (track.lessons) {
            html += `
                <div class="sidebar-track">
                    <div class="sidebar-track-title">${track.title}</div>
                    <ul class="sidebar-lessons">
            `;

            for (const lesson of track.lessons) {
                const lessonPath = `${track.id}/${lesson.id}`;
                const isActive = lessonPath === currentPath;
                const isComplete = isLessonComplete(lessonPath);

                let className = '';
                if (isActive) className += ' active';
                if (isComplete) className += ' completed';

                html += `
                    <li>
                        <a href="lesson.html?lesson=${lessonPath}" class="${className.trim()}">
                            ${lesson.title}
                        </a>
                    </li>
                `;
            }

            html += `
                    </ul>
                </div>
            `;
        }
    }

    sidebar.innerHTML = html;

    // Add click handlers to save scroll position before navigation
    sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', saveSidebarScroll);
    });

    // Restore scroll position after rendering
    restoreSidebarScroll();
}

// ============================================
// Lesson Navigation
// ============================================

function renderLessonNav(currentPath) {
    const nav = document.getElementById('lesson-nav');
    if (!nav) return;

    const { getAdjacentLesson } = window.LearningLasair;

    const prev = getAdjacentLesson(currentPath, 'prev');
    const next = getAdjacentLesson(currentPath, 'next');

    let html = '';

    if (prev) {
        html += `
            <a href="lesson.html?lesson=${prev.path}" class="lesson-nav-prev">
                <span class="lesson-nav-label">&larr; Previous</span>
                <span class="lesson-nav-title">${prev.title}</span>
            </a>
        `;
    } else {
        html += '<div></div>';
    }

    if (next) {
        html += `
            <a href="lesson.html?lesson=${next.path}" class="lesson-nav-next">
                <span class="lesson-nav-label">Next &rarr;</span>
                <span class="lesson-nav-title">${next.title}</span>
            </a>
        `;
    }

    nav.innerHTML = html;
}

// ============================================
// Lesson Loading
// ============================================

async function loadLesson(lessonPath) {
    const { findLessonInfo } = window.LearningLasair;
    const info = findLessonInfo(lessonPath);

    if (!info) {
        document.getElementById('lesson-body').innerHTML = `
            <div class="callout callout-warning">
                <div class="callout-title">Lesson Not Found</div>
                <p>The lesson "${lessonPath}" doesn't exist or hasn't been created yet.</p>
                <p><a href="index.html">Return to the course overview</a></p>
            </div>
        `;
        return;
    }

    // Update header
    document.getElementById('lesson-track').textContent = info.track.title;
    document.getElementById('lesson-title').textContent = info.lesson.title;
    document.title = `${info.lesson.title} - ${COURSE_DATA.title || 'jam-learning'}`;

    // Every section keeps its lessons beside lesson.html, in content/ (the service worker
    // precaches them under the same relative URL)
    const contentPath = `content/${lessonPath}.md`;

    try {
        const response = await fetch(contentPath);
        if (!response.ok) {
            throw new Error(`Content not found (${response.status})`);
        }

        const markdown = await response.text();

        // Parse frontmatter if present
        let content = markdown;
        // A lesson may open with its own "# Title"; the page header already shows the title
        const heading = content.match(/^\s*#\s+(.+?)\s*\n/);
        if (heading && heading[1].trim().toLowerCase() === info.lesson.title.trim().toLowerCase()) {
            content = content.slice(heading[0].length);
        }
        let meta = {};

        if (markdown.startsWith('---')) {
            const parts = markdown.split('---');
            if (parts.length >= 3) {
                meta = parseYamlFrontmatter(parts[1]);
                content = parts.slice(2).join('---');
            }
        }

        // Update meta
        if (meta.duration) {
            document.getElementById('lesson-meta').textContent = `${meta.duration} read`;
        }

        // Handle video lessons
        const lessonBody = document.getElementById('lesson-body');
        let videoEmbed = '';

        if (meta.video) {
            // Extract YouTube video ID from URL
            const videoId = extractYouTubeId(meta.video);
            if (videoId) {
                videoEmbed = `
                    <div class="video-container">
                        <iframe
                            src="https://www.youtube.com/embed/${videoId}"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowfullscreen
                        ></iframe>
                    </div>
                `;
            }
            lessonBody.classList.add('video-lesson');
        }

        // M1 Understanding lessons link straight into their self-test flashcards
        let quizLink = '';
        if (lessonPath.startsWith('06-m1-exam/') && (/## Question bank/.test(content) || /^06-m1-exam\/f\d\d-/.test(lessonPath))) {
            const chapterId = lessonPath.split('/')[1];
            quizLink = `<p class="exam-quiz-link"><a href="exam.html?chapter=${chapterId}">&#9654; Test yourself on this chapter</a></p>`;
        }
        // A course can flag lessons that show implementation code (course.json code_notice:
        // {match, html}): Learning Lasair does, for the JAM Prize's clean-room rules
        const notice = window.LearningLasair.COURSE_STRUCTURE.code_notice;
        const codeNotice = notice && new RegExp(notice.match).test(content)
            ? `<div class="callout callout-info code-notice">${notice.html}</div>` : '';
        // Render markdown with video embed at top
        lessonBody.innerHTML = codeNotice + videoEmbed + quizLink + marked.parse(content);

        // Apply syntax highlighting to any missed blocks
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

    } catch (error) {
        console.error('Failed to load lesson:', error);

        // Every listed lesson exists (tools/check.py), so a failure here is a loading problem:
        // say what failed rather than pretend the lesson is unwritten
        document.getElementById('lesson-body').innerHTML = `
            <div class="callout callout-warning">
                <div class="callout-title">This lesson did not load</div>
                <p><code>${escapeHtml(contentPath)}</code>: ${escapeHtml(error.message || String(error))}</p>
                <p>Reload the page. If it keeps failing, the <a href="index.html">course overview</a>
                lists every lesson, and an issue on GitHub with this message helps us fix it.</p>
            </div>
        `;
    }

    // Render navigation
    renderLessonNav(lessonPath);
    renderSidebar(lessonPath);
}

function parseYamlFrontmatter(yaml) {
    const meta = {};
    const lines = yaml.trim().split('\n');

    for (const line of lines) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            meta[key.trim()] = valueParts.join(':').trim();
        }
    }

    return meta;
}

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    const { getLessonPath, ready } = window.LearningLasair;
    const lessonPath = getLessonPath();

    // Course structure is fetched from data/course.json - wait for it
    await ready;
    loadLesson(lessonPath);
});
