import { jsPDF } from 'jspdf';
import { RegistrationData } from '../types';
import { CONFERENCE_INFO } from '../data/conferenceData';

/**
 * Generates an official SHIFT 1.0 Delegate Pass PDF and triggers a browser download
 * File is named using the attendee's canonical pass ID: SHIFT-XXXX-UENR.pdf
 */
export async function generateAndDownloadTicketPdf(
  registration: RegistrationData
): Promise<{ success: boolean; filename: string; blob?: Blob; error?: string }> {
  try {
    if (!registration || !registration.passId) {
      throw new Error('Missing registration data or Pass ID.');
    }

    const passId = registration.passId.trim();
    const filename = `${passId}.pdf`;

    // Create A5 Landscape PDF (210mm x 148mm) for an authentic executive event credential pass
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a5'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 148mm

    // 1. Deep Midnight Background (#0B132B)
    doc.setFillColor(11, 19, 43);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // 2. Top Navy Accent Header Bar (#1E293B)
    doc.setFillColor(30, 41, 59);
    doc.rect(8, 8, pageWidth - 16, 26, 'F');

    // 3. Gold / Cyan Border Frame
    doc.setDrawColor(56, 189, 248); // #38BDF8
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

    // Header Content
    doc.setTextColor(56, 189, 248);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('WORLDWIDE EVANGELISM SERVICE (WES) x UENR SCC', 14, 15);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('SHIFT 1.0 — BEYOND THE DEGREE', 14, 23);

    doc.setTextColor(148, 163, 184); // #94A3B8
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Annual Campus Leadership, Purpose & Kingdom Career Summit', 14, 29);

    // Verified Badge (Top Right)
    doc.setFillColor(16, 185, 129); // Emerald #10B981
    doc.roundedRect(pageWidth - 48, 13, 34, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('OFFICIAL PASS', pageWidth - 31, 17.5, { align: 'center' });

    // 4. Main Pass Body Card (#141E33)
    doc.setFillColor(20, 30, 51);
    doc.roundedRect(12, 38, pageWidth - 24, 74, 3, 3, 'F');
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.4);
    doc.roundedRect(12, 38, pageWidth - 24, 74, 3, 3, 'S');

    // Left Column: Delegate Details
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('DELEGATE FULL NAME', 18, 46);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const displayName = (registration.fullName || 'Delegate').toUpperCase();
    doc.text(displayName.length > 32 ? displayName.slice(0, 32) + '...' : displayName, 18, 53);

    // Grid row 1: Pass ID & WhatsApp/Phone
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('PASS ID (FAST-TRACK)', 18, 62);
    doc.text('CONTACT PHONE / WHATSAPP', 80, 62);

    doc.setTextColor(56, 189, 248);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(passId, 18, 68);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(registration.phone || 'N/A', 80, 68);

    // Grid row 2: Academic Standing & Department
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('ACADEMIC STANDING', 18, 77);
    doc.text('DEPARTMENT / FACULTY', 80, 77);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`LEVEL ${String(registration.academicLevel || '300').toUpperCase()}`, 18, 83);

    doc.setFont('helvetica', 'normal');
    const dept = registration.department || 'General Student';
    doc.text(dept.length > 36 ? dept.slice(0, 36) + '...' : dept, 80, 83);

    // Grid row 3: Admission Status & Seat Allocation
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('TICKET STATUS', 18, 92);
    doc.text('SEAT ALLOCATION', 80, 92);

    doc.setTextColor(16, 185, 129); // Emerald
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('CONFIRMED DELEGATE', 18, 98);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('Main Auditorium (Reserved Seat)', 80, 98);

    // Right Column: Barcode & Entry Gate Block
    const barcodeBoxX = 146;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(barcodeBoxX, 42, 46, 66, 2, 2, 'F');
    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(0.4);
    doc.roundedRect(barcodeBoxX, 42, 46, 66, 2, 2, 'S');

    doc.setTextColor(56, 189, 248);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('DOOR CHECK-IN CODE', barcodeBoxX + 23, 48, { align: 'center' });

    // Simulated Barcode Lines
    const barTop = 52;
    const barHeight = 28;
    const barWidths = [1.2, 0.4, 0.8, 1.6, 0.4, 1.0, 0.6, 1.4, 0.4, 0.8, 1.2, 0.6, 1.6, 0.4, 0.8, 1.0, 0.4, 1.4, 0.8, 0.4, 1.2, 0.6, 1.6, 0.4, 1.0, 0.8, 1.2, 0.4, 1.4, 0.6, 0.8];
    let currX = barcodeBoxX + 4;
    doc.setFillColor(255, 255, 255);
    for (const w of barWidths) {
      if (currX + w > barcodeBoxX + 42) break;
      doc.rect(currX, barTop, w, barHeight, 'F');
      currX += w + 0.5;
    }

    doc.setTextColor(226, 232, 240);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.text(`*${passId}*`, barcodeBoxX + 23, 85, { align: 'center' });

    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text('Scan for Fast-Track', barcodeBoxX + 23, 91, { align: 'center' });
    doc.text('Attendance Entry', barcodeBoxX + 23, 94.5, { align: 'center' });

    doc.setFillColor(56, 189, 248);
    doc.roundedRect(barcodeBoxX + 5, 98, 36, 6, 1.5, 1.5, 'F');
    doc.setTextColor(11, 19, 43);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text('GATE: MAIN AUDITORIUM', barcodeBoxX + 23, 102, { align: 'center' });

    // 5. Bottom Event Schedule & Logistics Footer (#1E293B)
    doc.setFillColor(30, 41, 59);
    doc.rect(8, pageHeight - 32, pageWidth - 16, 24, 'F');

    doc.setTextColor(56, 189, 248);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('DATE & TIME', 14, pageHeight - 24);
    doc.text('CONFERENCE VENUE', 78, pageHeight - 24);
    doc.text('INSTRUCTIONS', 142, pageHeight - 24);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Saturday, Nov 28, 2026', 14, pageHeight - 19);
    doc.text('2:00 PM GMT (Doors 1:15 PM)', 14, pageHeight - 15);

    doc.text(CONFERENCE_INFO.venue, 78, pageHeight - 19);
    doc.text('Sunyani, Bono Region, Ghana', 78, pageHeight - 15);

    doc.setTextColor(203, 213, 225);
    doc.text('• Present this PDF on phone or printed.', 142, pageHeight - 19);
    doc.text('• Arrive by 1:30 PM for priority seating.', 142, pageHeight - 15);

    // Generate real PDF Blob
    const pdfBlob = doc.output('blob');

    // Trigger browser download safely using an anchor element
    downloadBlob(pdfBlob, filename);

    return {
      success: true,
      filename,
      blob: pdfBlob
    };
  } catch (err: any) {
    console.error('[Ticket PDF Generator] Error:', err);
    return {
      success: false,
      filename: `${registration.passId || 'ticket'}.pdf`,
      error: err?.message || 'Failed to generate PDF pass document.'
    };
  }
}

/**
 * Generates an official high-resolution PNG image pass card for attendees on mobile or desktop
 */
export async function generateAndDownloadTicketImage(
  registration: RegistrationData
): Promise<{ success: boolean; filename: string; blob?: Blob; error?: string }> {
  try {
    if (!registration || !registration.passId) {
      throw new Error('Missing registration data or Pass ID.');
    }

    const passId = registration.passId.trim();
    const filename = `${passId}-Pass.png`;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available.');
    }

    // Background
    ctx.fillStyle = '#0B132B';
    ctx.fillRect(0, 0, 1200, 700);

    // Frame border
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 640);

    // Header bar
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(30, 30, 1140, 120);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('WORLDWIDE EVANGELISM SERVICE (WES) x UENR SCC', 60, 68);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px serif';
    ctx.fillText('SHIFT 1.0 — BEYOND THE DEGREE', 60, 110);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Annual Campus Leadership, Purpose & Kingdom Career Summit', 60, 136);

    // Verified Badge
    ctx.fillStyle = '#10B981';
    ctx.beginPath();
    ctx.roundRect(970, 55, 170, 42, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL PASS', 1055, 82);
    ctx.textAlign = 'left';

    // Body Card
    ctx.fillStyle = '#141E33';
    ctx.beginPath();
    ctx.roundRect(50, 170, 780, 370, 12);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Delegate Details
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('DELEGATE FULL NAME', 80, 215);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px sans-serif';
    const name = (registration.fullName || 'Delegate').toUpperCase();
    ctx.fillText(name.length > 28 ? name.slice(0, 28) + '...' : name, 80, 255);

    // Pass ID & Phone
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('PASS ID (FAST-TRACK)', 80, 310);
    ctx.fillText('PHONE / WHATSAPP', 460, 310);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(passId, 80, 345);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px sans-serif';
    ctx.fillText(registration.phone || 'N/A', 460, 345);

    // Academic Standing & Department
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('ACADEMIC STANDING', 80, 400);
    ctx.fillText('DEPARTMENT / FACULTY', 460, 400);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`LEVEL ${String(registration.academicLevel || '300').toUpperCase()}`, 80, 435);

    ctx.font = '18px sans-serif';
    const dept = registration.department || 'General Student';
    ctx.fillText(dept.length > 28 ? dept.slice(0, 28) + '...' : dept, 460, 435);

    // Ticket Status & Seat
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('TICKET STATUS', 80, 485);
    ctx.fillText('SEAT ALLOCATION', 460, 485);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('CONFIRMED DELEGATE', 80, 515);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px sans-serif';
    ctx.fillText('Main Auditorium (Reserved Seat)', 460, 515);

    // Barcode Card (Right side)
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.roundRect(850, 170, 290, 370, 12);
    ctx.fill();
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DOOR CHECK-IN CODE', 995, 205);

    // Barcode stripes
    ctx.fillStyle = '#FFFFFF';
    const barX = 875;
    const barY = 225;
    const barW = [4, 2, 6, 2, 8, 3, 5, 2, 7, 3, 4, 2, 8, 3, 5, 2, 6, 4, 2, 7, 3, 5, 2, 6, 3, 8, 2, 4, 3, 6, 2];
    let currBx = barX;
    for (const w of barW) {
      if (currBx + w > 1115) break;
      ctx.fillRect(currBx, barY, w, 140);
      currBx += w + 3;
    }

    ctx.fillStyle = '#E2E8F0';
    ctx.font = 'bold 20px monospace';
    ctx.fillText(`*${passId}*`, 995, 400);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Scan for Fast-Track Entry', 995, 435);

    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.roundRect(880, 465, 230, 45, 8);
    ctx.fill();
    ctx.fillStyle = '#0B132B';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('GATE: MAIN AUDITORIUM', 995, 493);
    ctx.textAlign = 'left';

    // Footer bar
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(30, 560, 1140, 110);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('DATE & TIME', 60, 595);
    ctx.fillText('CONFERENCE VENUE', 460, 595);
    ctx.fillText('INSTRUCTIONS', 850, 595);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px sans-serif';
    ctx.fillText('Saturday, Nov 28, 2026', 60, 625);
    ctx.fillText('2:00 PM GMT (Doors 1:15 PM)', 60, 650);

    ctx.fillText(CONFERENCE_INFO.venue, 460, 625);
    ctx.fillText('Sunyani, Bono Region, Ghana', 460, 650);

    ctx.fillStyle = '#CBD5E1';
    ctx.font = '14px sans-serif';
    ctx.fillText('• Present pass on phone or printed.', 850, 625);
    ctx.fillText('• Arrive by 1:30 PM for priority seating.', 850, 650);

    // Convert to Blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (!blob) {
      throw new Error('Could not create image blob from canvas.');
    }

    downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      blob
    };
  } catch (err: any) {
    console.error('[Ticket Image Generator] Error:', err);
    return {
      success: false,
      filename: `${registration.passId || 'ticket'}-Pass.png`,
      error: err?.message || 'Failed to generate PNG image pass.'
    };
  }
}

/**
 * Downloads a Blob as a file in the browser, with safety cleanup
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.target = '_blank';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Safely clean up object URL after download has started
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(url);
    } catch {}
  }, 2500);
}
