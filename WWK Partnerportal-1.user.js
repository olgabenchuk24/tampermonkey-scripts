// ==UserScript==
// @name         WWK Partnerportal
// @author       RENTE IT
// @version      2
// @description  downloads every new document from WWK infobox
// @match        https://portal.wwk.de/group/vip/*
// ==/UserScript==

(function () {
    'use strict';

    // ----------------------------------------------------
    // 1) Button to start manually
    // ----------------------------------------------------
    const btn = document.createElement('button');
    btn.textContent = "WWK Dokumente";
    btn.style.position = "fixed";
    btn.style.top = "10px";
    btn.style.right = "10px";
    btn.style.zIndex = 9999;
    btn.style.padding = "8px 12px";
    btn.style.background = "#4CAF50";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.borderRadius = "4px";
    btn.style.cursor = "pointer";
    document.body.appendChild(btn);

    btn.addEventListener('click', async () => {
        await run();
    });

    async function run() {
        try {
            const documentLink = document.querySelector('a[href="/group/vip/dokumentenpostfach"]');
            documentLink.click();

            await waitFor(2000);

            const checkbox = document.getElementById(
                '_DokumentenpostfachPortlet_WAR_DokumentenpostfachPortletApp_INSTANCE_Rc9XlwPoylnE_:dokumentenpostfach_form:j_idt19_input'
            );

            if (!checkbox) {
                throw new Error('Failed to find the checkbox.');
            }

            if (checkbox.checked) {
                checkbox.click();
            }

            await waitFor(2000);

            let documentToDownload = document.querySelector('table tr:first-of-type td:nth-of-type(3) a');
            let downloadCount = 0;

            if (!documentToDownload) {
                alert('Es gibt keine neuen Dokumente zum Herunterladen.');
            }

            while (documentToDownload) {
                await waitFor(1000);
                documentToDownload.click();
                downloadCount++;

                await waitFor(3000);

                const newDocumentToDownload = document.querySelector('table tr:first-of-type td:nth-of-type(3) a');

                const isNewDocumentToDownlowedTheSameAsThePreviouslyDownloadedOne =
                    documentToDownload === newDocumentToDownload;

                if (isNewDocumentToDownlowedTheSameAsThePreviouslyDownloadedOne) {
                    throw new Error('The previous document has not yet disappeared');
                }

                documentToDownload = newDocumentToDownload;
            }

            if (downloadCount > 0) {
                alert('Alle neuen Dokumente wurden heruntergeladen.');
            }
        } catch (err) {
            alert('Automation failed:', err.message);
        }
    }

    async function waitFor(ms) {
        await new Promise(r => setTimeout(r, ms));
    }
})();
