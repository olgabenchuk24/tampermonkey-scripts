// ==UserScript==
// @name         Canada Life Partnerportal
// @author       RENTE IT
// @version      1
// @description  Downloads every not downloaded relevant document from Canada Life infobox
// @match        https://partnernet.canadalife.de/selfcare/partner-post/*
// ==/UserScript==

(function () {
    'use strict';

    const waitFor = ms => new Promise(r => setTimeout(r, ms));

    const waitForElement = (selector, timeout = 20000) => {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const el = document.querySelector(selector);
                if (el) return resolve(el);
                if (Date.now() - start > timeout) return reject(new Error(`Timeout: ${selector}`));
                requestAnimationFrame(check);
            };
            check();
        });
    };

    const waitForButtonWithText = (text, timeout = 20000) => {
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const check = () => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === text);
                if (btn) return resolve(btn);
                if (Date.now() - start > timeout) return reject(new Error(`Timeout for button: ${text}`));
                requestAnimationFrame(check);
            };
            check();
        });
    };

    const formatDateDot = date => {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}.${m}.${y}`;
    };

    const btn = document.createElement('button');
    btn.textContent = "Canada Life Dokumente";
    Object.assign(btn.style, {
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: 9999,
        padding: "8px 12px",
        background: "#4CAF50",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
    });
    document.body.appendChild(btn);

    btn.addEventListener('click', async () => {
        try {
            await selectDocumentType();
            await setStartDate();
            await waitFor(300);
            await searchDocuments();
            await waitForElement('#resultsTable');
            await sortAllRowsToSeeNotDownloaded();

            let hasFoundFirstDownloadedDocument = false;
            let ebabledNextLink;
            let documnetToDownloadCount = 0;
            let hasReachedDownloadLimit = false;

            do {
                const allDocumentsOnTheCurrentPage = getAllDocumetsRows();

                for (const row of allDocumentsOnTheCurrentPage) {
                    const td2 = row.querySelector('td:nth-of-type(2)');

                    hasFoundFirstDownloadedDocument = td2.textContent.trim() === 'Nein';
                    if (hasFoundFirstDownloadedDocument) {
                        break;
                    }

                    const td8 = row.querySelector('td:nth-of-type(8)');
                    if (td8.textContent.trim() === 'B01X') {
                           await new Promise(requestAnimationFrame);
                           const selectedDocumentsSizeText = document.querySelector('.cl-teaser-box-body p:nth-of-type(2)');
                           const currentSizeMB = getSizeInMBFromString(selectedDocumentsSizeText?.textContent ?? "");
                           if (currentSizeMB + 1 > 100) {
                              hasReachedDownloadLimit = true;
                              break;
                           }
                        await selectDocument(row);
                        documnetToDownloadCount++;
                    }


                }

                if (!hasFoundFirstDownloadedDocument) {
                    ebabledNextLink = Array.from(document.querySelectorAll('li.page-item:not(.disabled) a.page-link')).find(a => a.textContent.trim() === 'Nächste');

                    if (ebabledNextLink) {
                        await waitFor(3000);
                        ebabledNextLink.click();
                        await waitFor(3000);
                    }
                }
            } while (!hasFoundFirstDownloadedDocument && ebabledNextLink && !hasReachedDownloadLimit);

            if (documnetToDownloadCount === 0) {
                return alert('Es gibt keine neuen Dokumente zum Herunterladen.');
            }
            await waitFor(2000);
            await downloadDocuments();
            await waitForSpinnerToDisappear('.fa.fa-refresh.fa-spin.fa-1x.fa-fw.button-spinner');
            await waitFor(2000);
            alert('Alle neuen Dokumente wurden heruntergeladen.');
        } catch (err) {
            alert('Automation failed: ' + err.message);
        }
    });

    async function selectDocumentType() {
        await waitForElement('select.cl-formfield.w-input');
        const select = document.querySelector('select.cl-formfield.w-input');
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
    }

    async function setStartDate() {
        const dateInput = await waitForElement('#dateFrom');
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(new Date().getDate() - 3);
        dateInput.value = formatDateDot(oneWeekAgo);
        dateInput.dispatchEvent(new Event('input', { bubbles: true }));
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    async function searchDocuments() {
        const searchBtn = await waitForButtonWithText('Suchen');
        searchBtn.click();
    }

    async function sortAllRowsToSeeNotDownloaded() {
        const th = await waitForElement('table th:nth-of-type(2)');
        th.scrollIntoView({ behavior: 'instant', block: 'center' });
        th.click();
        await waitFor(3000);
        //th.click();
        //await waitFor(3000);
    }

    function getAllDocumetsRows() {
        return document.querySelectorAll('table tr.document-detail-row');
    }


    async function selectDocument(row) {
        const checkbox = row.querySelector('td:nth-of-type(1) input[type="checkbox"]');
        if (checkbox && !checkbox.checked && !checkbox.disabled) {
            checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await waitFor(300);
            checkbox.click();
            await waitFor(300);
        }
    }

    async function downloadDocuments() {
        const downloadBtn = await waitForButtonWithText('Zum Download');
        downloadBtn.click();
        await waitFor(500);
        const confirmBtn = await waitForButtonWithText('Herunterladen');
        confirmBtn.click();
    }

    function getSizeInMBFromString(str) {
        // Match a number followed by "MB". For example
        // "Größe: 14.70 MB" -> "14.70"
        // "Größe: 256 KB" -> null
        const match = str.match(/(\d+(\.\d+)?)\s*MB/i);

        if (match) {
            return parseFloat(match[1]);
        } else {
            return 1;
        }
    }

    async function waitForSpinnerToDisappear(selector, timeout = 100000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const el = document.querySelector(selector);
            const isVisible = el && window.getComputedStyle(el).display !== 'none' && el.offsetParent !== null;
            if (!el || !isVisible) return resolve();
            if (Date.now() - start > timeout) return reject(new Error('Spinner did not disappear in time'));
            requestAnimationFrame(check);
        };
        check();
    });
}
})();
