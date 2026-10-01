// ==UserScript==
// @name         Download Book For Offline Usage
// @namespace    greasemonkey-page-screenshot
// @version      1.0
// @description  Erstellt einen Screenshot von den Seiten
//
// @match        https://o3reader.onleihe.de/*
// @match        https://onleihe.de/*
//
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// ==/UserScript==


(function () {
    'use strict';

    let running = false;
    let stopRequested = false;

    const SAVE_DELAY = 800;
    const PAGE_CHANGE_TIMEOUT = 10000;

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function getActivePage() {
        return document.querySelector('.page.active');
    }

    function getCanvas(page) {
        return page?.querySelector('.canvasWrapper canvas');
    }

    function getPageNumber(page) {
        return page?.dataset?.pageNumber || 'unknown';
    }

    async function waitForPageChange(oldPageNumber) {
        const start = Date.now();

        while (Date.now() - start < PAGE_CHANGE_TIMEOUT) {
            const page = getActivePage();
            const newPageNumber = getPageNumber(page);

            if (page && newPageNumber !== oldPageNumber) {
                const canvas = getCanvas(page);

                if (canvas && canvas.width > 0 && canvas.height > 0) {
                    return page;
                }
            }

            await sleep(100);
        }

        throw new Error('Seitenwechsel Timeout');
    }

    function saveCanvas(canvas, pageNumber) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob(blob => {
                    if (!blob) {
                        reject(new Error('Canvas konnte nicht exportiert werden.'));
                        return;
                    }

                    const url = URL.createObjectURL(blob);

                    const link = document.createElement('a');

                    link.href = url;
                    link.download =
                        `page-${String(pageNumber).padStart(3, '0')}.png`;

                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 5000);

                    resolve();
                }, 'image/png');

            } catch (error) {
                reject(error);
            }
        });
    }

    async function saveAllPages(button) {
        if (running) {
            stopRequested = true;
            button.textContent = 'Stopping...';
            return;
        }

        running = true;
        stopRequested = false;

        button.textContent = 'Stop Saving';

        try {
            while (!stopRequested) {
                const page = getActivePage();

                if (!page) {
                    throw new Error('Keine .page.active gefunden.');
                }

                const canvas = getCanvas(page);

                if (!canvas) {
                    throw new Error('Kein Canvas gefunden.');
                }

                const pageNumber = getPageNumber(page);

                button.textContent = `Saving ${pageNumber}...`;

                await sleep(SAVE_DELAY);

                await saveCanvas(canvas, pageNumber);

                const nextButton =
                    document.querySelector('#reader-right-btn');

                if (!nextButton) {
                    console.log('Kein reader-right-btn gefunden.');
                    break;
                }

                if (
                    nextButton.disabled ||
                    nextButton.classList.contains('disabled') ||
                    nextButton.getAttribute('aria-disabled') === 'true'
                ) {
                    console.log('Letzte Seite erreicht.');
                    break;
                }

                button.textContent = `Next after ${pageNumber}...`;

                nextButton.click();

                try {
                    await waitForPageChange(pageNumber);
                } catch {
                    console.log('Keine weitere Seite erkannt.');
                    break;
                }

                await sleep(SAVE_DELAY);
            }

        } catch (error) {
            console.error(error);
            alert(error.message);

        } finally {
            running = false;
            stopRequested = false;

            button.textContent = 'Save All Canvas';
        }
    }

    function createButton() {
        if (document.getElementById('save-all-canvas-button')) {
            return;
        }

        const button = document.createElement('button');

        button.id = 'save-all-canvas-button';
        button.textContent = 'Save All Canvas';

        Object.assign(button.style, {
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            zIndex: '2147483647',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            border: '1px solid #333',
            borderRadius: '6px',
            background: '#ffffff',
            color: '#000000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)'
        });

        document.body.appendChild(button);

        button.addEventListener('click', () => {
            saveAllPages(button);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            createButton
        );
    } else {
        createButton();
    }

})();
