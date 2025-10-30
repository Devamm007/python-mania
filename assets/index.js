document.addEventListener('DOMContentLoaded', function () {
	// mobile nav toggle
	var navToggle = document.getElementById('nav-toggle');
	var nav = document.getElementById('site-nav');
	if (navToggle && nav) {
		// Handle menu toggle
		navToggle.addEventListener('click', function (e) {
			e.stopPropagation();
			nav.classList.toggle('open');
		});

		// Close menu when clicking outside
		document.addEventListener('click', function (e) {
			if (!nav.contains(e.target) && !navToggle.contains(e.target)) {
				nav.classList.remove('open');
			}
		});

		// Close menu when clicking a link
		nav.addEventListener('click', function (e) {
			if (e.target.tagName === 'A') {
				nav.classList.remove('open');
			}
		});

		// Close menu on window resize (in case screen size changes to desktop)
		window.addEventListener('resize', function () {
			if (window.innerWidth > 800) {
				nav.classList.remove('open');
			}
		});
	}

		// Parse Google Drive / Google Docs links and return {id, type}
		function parseDriveInfo(link) {
			if (!link) return null;
			// Docs (document)
			var m = link.match(/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'document' };
			// Slides (presentation)
			m = link.match(/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'presentation' };
			// Sheets (spreadsheet)
			m = link.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'spreadsheet' };
			// Forms
			m = link.match(/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'form' };
			// /file/d/FILEID pattern (Drive file)
			m = link.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'drive-file' };
			// id=FILEID query param
			m = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'drive-file' };
			// uc?id=FILEID
			m = link.match(/uc\?id=([a-zA-Z0-9_-]+)/);
			if (m) return { id: m[1], type: 'drive-file' };
			// direct-ish id (fallback) - 20+ chars
			m = link.match(/^([a-zA-Z0-9_-]{20,})$/);
			if (m) return { id: m[1], type: 'drive-file' };
			return null;
		}

		function buildEmbedSrc(link, overrideType) {
			var info = parseDriveInfo(link);
			if (!info) return null;
			var id = info.id;
			var type = overrideType || info.type;
			switch (type) {
				case 'document':
					return 'https://docs.google.com/document/d/' + id + '/preview';
				case 'presentation':
					// presentations work better with the /embed endpoint
					return 'https://docs.google.com/presentation/d/' + id + '/embed';
				case 'spreadsheet':
					return 'https://docs.google.com/spreadsheets/d/' + id + '/preview';
				case 'form':
					return 'https://docs.google.com/forms/d/' + id + '/viewform?embedded=true';
				case 'drive-file':
				default:
					return 'https://drive.google.com/file/d/' + id + '/preview';
			}
		}

		function createIframe(src, allowFullScreen) {
			var iframe = document.createElement('iframe');
			iframe.src = src;
			var allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
			if (allowFullScreen) allow += '; fullscreen';
			iframe.setAttribute('allow', allow);
			if (allowFullScreen) iframe.setAttribute('allowfullscreen', '');
			iframe.loading = 'lazy';
			iframe.referrerPolicy = 'no-referrer';
			return iframe;
		}

	// Find elements with data-drive-link and render embeds
	function embedDriveElements() {
		document.querySelectorAll('[data-drive-link]').forEach(function (el) {
			var link = el.getAttribute('data-drive-link') || '';
			link = link.trim();
			if (!link) {
                // Do not clear the element if link is empty, to preserve initial messages
				if (el.innerHTML.includes('embed-wrap')) {
                    el.innerHTML = '<p class="muted">No Drive link provided.</p>';
                }
				return;
			}
			var src = buildEmbedSrc(link);
			if (!src) {
				el.innerHTML = '<p class="muted">Unable to parse Drive link. Make sure it is a valid Google Drive file/share URL.</p>';
				return;
			}
			var info = parseDriveInfo(link) || {type: 'drive-file'};
			var wrap = document.createElement('div'); wrap.className = 'embed-wrap ' + info.type;
			var inner = document.createElement('div'); inner.className = 'embed-inner';
			// choose fullscreen allowance based on type
			var allowFS = info.type === 'presentation';
			inner.appendChild(createIframe(src, allowFS));
			wrap.appendChild(inner);
			el.innerHTML = '';
			el.appendChild(wrap);
		});
	}

	// Initialize existing embeds (like the one on rulebook.html)
	embedDriveElements();

	// Adjust embed heights to fit viewport
	function adjustEmbedHeights(){
		var header = document.querySelector('.site-header');
		var footer = document.querySelector('.site-footer');
		var content = document.querySelector('.content');
		var headerH = header ? header.getBoundingClientRect().height : 0;
		var footerH = footer ? footer.getBoundingClientRect().height : 0;
		var contentPadding = content ? parseInt(getComputedStyle(content).padding) * 2 : 0;
		var viewportH = window.innerHeight || document.documentElement.clientHeight;
		
		document.querySelectorAll('.embed-wrap').forEach(function(wrap){
			var inner = wrap.querySelector('.embed-inner');
			if(!inner) return;
			
			var type = wrap.classList.contains('document') ? 'document' : 
					  wrap.classList.contains('presentation') ? 'presentation' : 'other';
			
			// Calculate available space based on screen size
			var reserve = window.innerWidth > 768 ? 180 : 140; // Less reserved space on mobile
			var titleArea = document.querySelector('.section-title') ? 60 : 0;
			var available = viewportH - headerH - footerH - reserve - contentPadding - titleArea;
			
			// Ensure minimum height
			available = Math.max(available, type === 'document' ? 400 : 300);
			
			// Set height based on content type
			var heightPercentage = type === 'document' ? 0.95 :
								 type === 'presentation' ? 0.85 : 0.9;
			
			// Apply the calculated height
			var finalHeight = Math.round(available * heightPercentage);
			inner.style.height = finalHeight + 'px';
			
			// For documents, ensure content is fully visible
			if(type === 'document') {
				inner.style.minHeight = Math.min(finalHeight, 400) + 'px';
			}
		});
	}

	// run on load and resize
	adjustEmbedHeights();
	window.addEventListener('resize', function(){
		clearTimeout(window._embedResizeTimer);
		window._embedResizeTimer = setTimeout(adjustEmbedHeights,120);
	});
	window.addEventListener('orientationchange', function(){ setTimeout(adjustEmbedHeights,200); });

	// --- NEW: Handler for slide navigation list ---
    var slideNav = document.getElementById('slide-nav-list');
    var slidePreview = document.getElementById('drive-preview');
    
    if (slideNav && slidePreview) {
        // Function to set the active link
        function setActiveSlideLink(activeLink) {
            // Clear active state from all links
            slideNav.querySelectorAll('.slide-trigger').forEach(function(link) {
                link.classList.remove('active');
            });
            // Add active state to the clicked link
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        slideNav.addEventListener('click', function(e) {
            var targetLink = e.target.closest('.slide-trigger');
            if (targetLink) {
                e.preventDefault();
                var slideLink = targetLink.getAttribute('data-slide-link');
                
                if (slideLink) {
                    slidePreview.setAttribute('data-drive-link', slideLink);
                    setActiveSlideLink(targetLink);
                } else {
                    // Handle empty link (e.g., "Coming Soon")
                    slidePreview.innerHTML = '<p class="muted">Slides for this day are not yet available.</p>';
                    slidePreview.removeAttribute('data-drive-link');
                    setActiveSlideLink(targetLink);
                }
                
                // Re-run the embed function to load the new content
                embedDriveElements();
                // Re-adjust heights in case the content type changed
                adjustEmbedHeights();
            }
        });

        // Auto-load the first valid slide on page load
        var firstSlide = slideNav.querySelector('.slide-trigger[data-slide-link]');
        if (firstSlide && firstSlide.getAttribute('data-slide-link')) {
            firstSlide.click();
        }
    }
});
