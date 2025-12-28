import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type PaperSize = 'a4' | 'letter' | 'legal';
export type Orientation = 'portrait' | 'landscape';

interface PageDimensions {
    width: number;
    height: number;
}

interface PDFOptions {
    grayscale?: boolean;
}

const PAGE_DIMENSIONS: Record<PaperSize, PageDimensions> = {
    a4: { width: 210, height: 297 }, // mm
    letter: { width: 215.9, height: 279.4 }, // mm
    legal: { width: 215.9, height: 355.6 }, // mm
};

const applyGrayscaleToCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = avg;     // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
};

// Helper to release canvas memory
const disposeCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    canvas.width = 0;
    canvas.height = 0;
};

// Helper for a small delay to yield to the main thread
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generatePDF = async (
    containerId: string,
    size: PaperSize,
    orientation: Orientation,
    filename: string = 'placeholders.pdf',
    options: PDFOptions = {}
) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Get all page elements within the container
    const pages = Array.from(container.getElementsByClassName('print-page')) as HTMLElement[];
    if (pages.length === 0) return;

    const paperDim = PAGE_DIMENSIONS[size];
    const pageWidth = orientation === 'portrait' ? paperDim.width : paperDim.height;
    const pageHeight = orientation === 'portrait' ? paperDim.height : paperDim.width;

    const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: size === 'letter' ? 'letter' : size === 'legal' ? 'legal' : 'a4',
        compress: true // Enable internal compression
    });

    for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i];

        if (i > 0) {
            pdf.addPage(size === 'letter' ? 'letter' : size === 'legal' ? 'legal' : 'a4', orientation);
        }

        // Capture page element
        let canvas = await html2canvas(pageElement, {
            scale: 1.5, // 1.5 is ideal balance for quality vs memory
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: pageElement.scrollWidth,
            height: pageElement.scrollHeight
        });

        // Apply grayscale if enabled (in-place modification)
        if (options.grayscale) {
            canvas = applyGrayscaleToCanvas(canvas);
        }

        // Use the grid element's dimensions for accurate scaling
        const gridElement = pageElement.querySelector('.grid') as HTMLElement;
        const gridWidth = gridElement ? parseFloat(gridElement.style.width) : 190.5;
        const gridHeight = gridElement ? parseFloat(gridElement.style.height) : (3 * 88.9);

        const xOffset = (pageWidth - gridWidth) / 2;
        const yOffset = (pageHeight - gridHeight) / 2;

        // Pass canvas directly to addImage (jsPDF handles the conversion)
        // JPEG 0.8 quality and 'FAST' compression
        pdf.addImage(canvas, 'JPEG', xOffset, yOffset, gridWidth, gridHeight, undefined, 'FAST');

        // EXPLICIT DISPOSAL: Release canvas memory before next page
        disposeCanvas(canvas);

        // Yield to allow garbage collection and prevent UI lockup
        if (pages.length > 5) {
            await delay(50);
        }
    }

    pdf.save(filename);
};
