import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPdfReport(opts: {
  filename: string;
  title: string;
  subtitle?: string;
  sections: { heading: string; headers: string[]; rows: (string | number)[][] }[];
}) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(18);
  doc.text(opts.title, 40, 42);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(opts.subtitle ?? `Generated ${new Date().toLocaleString()}`, 40, 60);
  doc.setTextColor(0);

  let y = 84;
  for (const s of opts.sections) {
    doc.setFontSize(12);
    doc.text(s.heading, 40, y);
    autoTable(doc, {
      startY: y + 8,
      head: [s.headers],
      body: s.rows.map((r) => r.map((c) => String(c ?? ""))),
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      margin: { left: 40, right: 40 },
    });
    y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 34;
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 50;
    }
  }
  doc.save(opts.filename);
}
