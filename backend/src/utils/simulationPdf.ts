interface SimulationReportPayload {
    generatedAt: string;
    durationSeconds: number;
    alarmCount: number;
    acknowledgedCount: number;
    energyKwh: number;
    treatedVolumeLiters: number;
    availabilityRate: number;
    summarySeries: Array<{ label: string; values: number[]; color: string }>;
}

const pdfEscape = (value: string): string =>
    value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const normalized = clean.length === 3 ? clean.split('').map((char) => char + char).join('') : clean;
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    return [r, g, b];
};

const textLine = (x: number, y: number, fontSize: number, text: string): string =>
    `BT /F1 ${fontSize} Tf 1 0 0 1 ${x} ${y} Tm (${pdfEscape(text)}) Tj ET`;

const drawPolyline = (
    values: number[],
    color: string,
    x: number,
    y: number,
    width: number,
    height: number,
    min: number,
    max: number,
): string => {
    if (values.length === 0) {
        return '';
    }

    const [r, g, b] = hexToRgb(color);
    const range = max - min || 1;
    const points = values.map((value, index) => {
        const px = x + (index / Math.max(values.length - 1, 1)) * width;
        const py = y + ((value - min) / range) * height;
        return { x: px, y: py };
    });

    const path = points
        .map((point, index) => `${index === 0 ? 'm' : 'l'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
        .join('\n');

    return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG 2 w\n${path}\nS`;
};

export const buildSimulationReportPdf = (report: SimulationReportPayload): Buffer => {
    const lines: string[] = [];
    lines.push('0.12 0.16 0.25 rg 40 735 515 70 re f');
    lines.push(textLine(56, 780, 24, 'SCADA Water Station - Rapport de simulation'));
    lines.push(textLine(56, 758, 11, `Genere le ${new Date(report.generatedAt).toLocaleString('fr-FR')}`));

    lines.push(textLine(50, 710, 14, `Duree totale: ${new Date(report.durationSeconds * 1000).toISOString().slice(11, 19)}`));
    lines.push(textLine(50, 692, 14, `Alarmes declenchees: ${report.alarmCount}`));
    lines.push(textLine(50, 674, 14, `Alarmes acquittees: ${report.acknowledgedCount}`));
    lines.push(textLine(50, 656, 14, `Consommation energetique: ${report.energyKwh.toFixed(2)} kWh`));
    lines.push(textLine(50, 638, 14, `Volume traite: ${report.treatedVolumeLiters.toFixed(1)} L`));
    lines.push(textLine(50, 620, 14, `Disponibilite: ${report.availabilityRate.toFixed(1)} %`));

    lines.push('0.7 0.75 0.85 RG 1 w 50 360 500 210 re S');
    lines.push(textLine(50, 584, 16, 'Graphique recapitulatif'));

    const allValues = report.summarySeries.reduce<number[]>((accumulator, series) => accumulator.concat(series.values), []);
    const min = Math.min(...allValues, 0);
    const max = Math.max(...allValues, 1);
    const chartX = 70;
    const chartY = 385;
    const chartWidth = 455;
    const chartHeight = 155;

    for (let index = 0; index < 4; index += 1) {
        const gy = chartY + (chartHeight / 3) * index;
        lines.push(`0.85 0.88 0.93 RG 0.5 w ${chartX} ${gy.toFixed(2)} m ${chartX + chartWidth} ${gy.toFixed(2)} l S`);
    }

    report.summarySeries.forEach((series, index) => {
        lines.push(drawPolyline(series.values, series.color, chartX, chartY, chartWidth, chartHeight, min, max));
        const [r, g, b] = hexToRgb(series.color);
        const legendY = 334 - index * 18;
        lines.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg 50 ${legendY - 3} 10 10 re f`);
        lines.push(textLine(68, legendY, 11, `${series.label} (${series.values.length} points)`));
    });

    lines.push(textLine(50, 286, 11, 'Document genere automatiquement par le moteur de simulation SCADA.'));

    const contentStream = lines.join('\n');
    const objects = [
        '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
        '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
        '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj',
        '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
        `5 0 obj << /Length ${Buffer.byteLength(contentStream, 'utf8')} >> stream\n${contentStream}\nendstream endobj`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((object) => {
        offsets.push(Buffer.byteLength(pdf, 'utf8'));
        pdf += `${object}\n`;
    });

    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach((offset) => {
        pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
};
