let base64Image = null;

const body                 = document.getElementById( 'body'               );
const dropzone             = document.getElementById( 'dropzone'           );
const fileInput            = document.getElementById( 'fileInput'          );
const sizeSelect           = document.getElementById( 'size'               );
const bookmarkBtn          = document.getElementById( 'bookmarkBtn'        );
const localFaviconBtn      = document.getElementById( 'localFaviconBtn'    );
const uniqueBtn            = document.getElementById( 'uniqueBtn'          );
const titleInput           = document.getElementById( 'title'              );
const previewImg           = document.getElementById( 'preview'            );
const announceBar          = document.getElementById( 'announce'           );
const urlPatternInput      = document.getElementById( 'urlPattern'         );
const useRegexCheckbox     = document.getElementById( 'useRegex'           );
const customFaviconsList   = document.getElementById( 'customFaviconsList' );

const tabs                 = document.querySelectorAll( '.tab'         );
const tabContents          = document.querySelectorAll( '.tab-content' );

function announce(text, bgColor, textColor) {
    announceBar.innerText             = text;
    announceBar.style.backgroundColor = bgColor;
    announceBar.style.color           = textColor;

    setTimeout(function() {
        announceBar.innerText = "";
    }, 4000);
}

// Helper: load file and resize
function processFile(file) {
    if (!file || !file.type.startsWith('image/')) return announce("Please upload an image.", "red", "white");

    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
        const size = parseInt(sizeSelect.value);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);

        base64Image = canvas.toDataURL('image/png').split(',')[1];
        previewImg.src = canvas.toDataURL('image/png');
    };
}

// Drag-and-drop
body.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.style.borderColor = 'blue';
});

body.addEventListener('dragleave', e => {
    dropzone.style.borderColor = '#aaa';
});

body.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.style.borderColor = '#aaa';
    const file = e.dataTransfer.files[0];
    processFile(file);
});

// Click to open file picker
dropzone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    processFile(file);
});

// Resize when dropdown changes
sizeSelect.addEventListener('change', () => {
    if (!base64Image) return;
    const img = new Image();
    img.src = previewImg.src;
    img.onload = () => {
        const size = parseInt(sizeSelect.value);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        base64Image = canvas.toDataURL('image/png').split(',')[1];
        previewImg.src = canvas.toDataURL('image/png');
    };
});

// Tab switching functionality
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        document.getElementById(`${tabName}Tab`).classList.add('active');

        // If manage tab is selected, load the custom favicons list
        if (tabName === 'manage') {
            loadCustomFaviconsList();
        }
    });
});

// Load custom favicons list
async function loadCustomFaviconsList() {
    try {
        const storage = await browser.storage.local.get('customFavicons');
        const customFavicons = storage.customFavicons || {};

        customFaviconsList.innerText = '';

        if (Object.keys(customFavicons).length === 0) {
            customFaviconsList.innerText = 'No custom favicons set';
            return;
        }

        for (const [pattern, faviconData] of Object.entries(customFavicons)) {
            const item = document.createElement('div');
            item.className = 'favicon-item';

            const img = document.createElement('img');
            img.src = `data:image/png;base64,${faviconData.base64Image}`;

            const url = document.createElement('span');
            url.className = 'url';
            url.textContent = pattern;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.textContent = 'Remove';
            removeBtn.addEventListener('click', async () => {
                // Remove from storage
                delete customFavicons[pattern];
                await browser.storage.local.set({ customFavicons });

                // Reload list
                loadCustomFaviconsList();

                announce('Favicon removed', 'green', 'white');
            });

            item.appendChild(img);
            item.appendChild(url);
            item.appendChild(removeBtn);

            customFaviconsList.appendChild(item);
        }
    } catch (err) {
        console.error('Error loading custom favicons list:', err);
        customFaviconsList.innerText = '<p>Error loading custom favicons</p>';
    }
}

// Initialize URL pattern input with current URL
window.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const currentUrl = params.get("tabUrl");

    if (currentUrl) {
        urlPatternInput.value = currentUrl;
    }
});

// Change local favicon
localFaviconBtn.addEventListener('click', async () => {
    if (!base64Image) return announce("Please upload an image first.", "red", "white");

    const urlPattern = urlPatternInput.value.trim();
    if (!urlPattern) return announce("Please enter a URL or pattern.", "red", "white");

    try {
        // Store the favicon in local storage
        const faviconData = {
            base64Image: base64Image,
            size: parseInt(sizeSelect.value),
            isRegex: useRegexCheckbox.checked
        };

        // Get existing favicons
        const storage = await browser.storage.local.get('customFavicons');
        const customFavicons = storage.customFavicons || {};

        customFavicons[urlPattern] = faviconData;
        await browser.storage.local.set({ customFavicons });


        await browser.runtime.sendMessage({
          action:      "newRule",
          url:         urlPattern,
          faviconData: faviconData
        });

        announce('Favicon changed!', "green", "white");
    } catch (err) {
        console.error(err);
        announce('Failed to change favicon', "red", "white");
    }
});

// Create bookmark
bookmarkBtn.addEventListener('click', async () => {
    if (!base64Image)             return announce("Please upload an image first.",            "red", "white");
    if (useRegexCheckbox.checked) return announce("Cannot create bookmark for regex pattern", "red", "white");

    const params        = new URLSearchParams(window.location.search);
    const currentUrl    = params.get("tabUrl");
    const customUrl     = `https://0xa.click/?p=${encodeURIComponent(base64Image)}&u=${encodeURIComponent(currentUrl)}`;
    const bookmarkTitle = titleInput.value.trim();

    try {
        await browser.bookmarks.create({ title: bookmarkTitle, url: customUrl, parentId: "toolbar_____" });
        await browser.runtime.sendMessage({ action: "makeUnique" });
        announce('Bookmark created! Visit it to load favicon.', "green", "white");

        // Clear inputs
        titleInput.value = '';
        previewImg.src = '';
        base64Image = null;
    } catch (err) {
        console.error(err);
        announce('Failed to create bookmark', "red", "white");
    }
});


//  uniqueBtn.addEventListener('click', async () => {
//      await browser.runtime.sendMessage({
//        action:      "makeUnique",
//      });
// });
