"""
Renders one RegulatoryReport as a printable PDF — a statutory-style compliance
return, not a screenshot of the dashboard. Built with reportlab's platypus
layer directly (tables, paragraph styles, a running page header/footer)
rather than an HTML-to-PDF conversion, so the document reads like something
that was typeset for filing, not a rendered webpage.

Pure-Python (no system packages beyond the reportlab wheel itself), which is
why it's the PDF library here rather than WeasyPrint/wkhtmltopdf — no extra
apt install in the Dockerfile.
"""

from datetime import datetime
from io import BytesIO
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from ..models.regulatory_report import RegulatoryReport

# A muted, print-appropriate palette — an accent for rules/headings, otherwise
# black-on-white. Deliberately not the app's amber/glass theme: this document
# has to still read correctly off a black-and-white photocopier.
_INK = colors.HexColor("#1a1a1a")
_ACCENT = colors.HexColor("#5c3a24")
_RULE = colors.HexColor("#b8a99a")
_MUTED = colors.HexColor("#5a5a5a")
_ZEBRA = colors.HexColor("#f4f0ec")

_PILLAR_LABEL = {"safety": "Safety", "production": "Production", "labour": "Labour"}
_STATUS_LABEL = {
    "submitted": "Submitted",
    "under_review": "Under Review",
    "verified": "Verified",
    "disputed": "Disputed",
}
_PRIORITY_LABEL = {"advisory": "Advisory", "mandatory": "Mandatory", "immediate": "Immediate"}


def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "ReturnTitle", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=15, leading=18, textColor=_INK, spaceAfter=2,
        ),
        "subtitle": ParagraphStyle(
            "ReturnSubtitle", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, textColor=_MUTED, spaceAfter=0,
        ),
        "h2": ParagraphStyle(
            "SectionHeading", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=11, leading=14, textColor=_ACCENT, spaceBefore=14, spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "Body", parent=base["Normal"], fontName="Helvetica", fontSize=9.5,
            leading=13, textColor=_INK, alignment=TA_JUSTIFY,
        ),
        "note": ParagraphStyle(
            "Note", parent=base["Normal"], fontName="Helvetica-Oblique", fontSize=9,
            leading=12.5, textColor=_INK, leftIndent=10, spaceBefore=2, spaceAfter=6,
        ),
        "cell": ParagraphStyle("Cell", fontName="Helvetica", fontSize=8.5, leading=11, textColor=_INK),
        "cellHead": ParagraphStyle(
            "CellHead", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white
        ),
        "small": ParagraphStyle("Small", fontName="Helvetica", fontSize=8, textColor=_MUTED),
    }


def _fmt_date(value: Optional[datetime]) -> str:
    return value.strftime("%d %b %Y") if value else "—"


def _fmt_dt(value: Optional[datetime]) -> str:
    return value.strftime("%d %b %Y, %H:%M") if value else "—"


def _fmt_hours(value: Optional[float]) -> str:
    return f"{value:.1f} h" if value is not None else "—"


def _table(rows: list[list], widths: list[float], styles: dict, zebra: bool = True) -> Table:
    body_rows = [[Paragraph(str(c), styles["cellHead"]) for c in rows[0]]] + [
        [c if isinstance(c, Paragraph) else Paragraph(str(c), styles["cell"]) for c in row]
        for row in rows[1:]
    ]
    t = Table(body_rows, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), _ACCENT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.75, _ACCENT),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, _RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 1), (-1, -1), 0.4, _RULE),
    ]
    if zebra:
        for i in range(1, len(body_rows)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), _ZEBRA))
    t.setStyle(TableStyle(style))
    return t


def _header_footer(report: RegulatoryReport, mine_name: str):
    def _draw(canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(_RULE)
        canvas.setLineWidth(0.5)
        canvas.line(20 * mm, 285 * mm, 190 * mm, 285 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(_MUTED)
        canvas.drawString(20 * mm, 287 * mm, mine_name.upper())
        canvas.drawRightString(190 * mm, 287 * mm, f"Ref. {str(report.id).upper()}")

        canvas.line(20 * mm, 17 * mm, 190 * mm, 17 * mm)
        canvas.setFont("Helvetica", 6.5)
        canvas.drawCentredString(
            105 * mm, 13 * mm,
            "This return and any response to it are retained unmodified; a later verification "
            "is recorded as a separate, linked document.",
        )
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(20 * mm, 9 * mm, f"Generated {datetime.now().strftime('%d %b %Y, %H:%M')}")
        canvas.drawRightString(190 * mm, 9 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    return _draw


def generate_report_pdf(
    report: RegulatoryReport,
    *,
    mine_name: str,
    submitted_by_name: Optional[str],
    parent_period_label: Optional[str] = None,
) -> bytes:
    styles = _styles()
    buf = BytesIO()

    doc = BaseDocTemplate(
        buf, pagesize=A4,
        topMargin=30 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
        title=f"{mine_name} — {report.period_label} — {report.report_type}",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_header_footer(report, mine_name))])

    is_submission = report.report_type == "corporate_submission"
    story: list = []

    story.append(Paragraph("Coal Mine Safety &amp; Compliance Return", styles["title"]))
    story.append(Paragraph(
        ("Corporate Submission" if is_submission else "Regulatory Verification")
        + f" · {_STATUS_LABEL.get(report.status, report.status)}",
        styles["subtitle"],
    ))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.2, color=_ACCENT))
    story.append(Spacer(1, 10))

    meta_rows = [
        ["Field", "Value"],
        ["Mine", mine_name],
        ["Reporting period", f"{report.period_label} ({_fmt_date(report.period_start)} – {_fmt_date(report.period_end)})"],
        ["Prepared by", submitted_by_name or "—"],
        ["Filed", _fmt_dt(report.submitted_at)],
    ]
    if not is_submission and parent_period_label:
        meta_rows.append(["Responds to", f"Submission for {parent_period_label}"])
    story.append(_table(meta_rows, [45 * mm, 105 * mm], styles, zebra=False))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Summary", styles["h2"]))
    story.append(_table(
        [
            ["Total", "Critical", "Resolved", "Open", "Avg. Resolution"],
            [
                str(report.total_safety_issues), str(report.critical_issues),
                str(report.resolved_issues), str(report.open_issues),
                _fmt_hours(report.average_resolution_time_hours),
            ],
        ],
        [30 * mm, 30 * mm, 30 * mm, 30 * mm, 30 * mm], styles, zebra=False,
    ))

    if report.level_breakdown:
        story.append(Paragraph("Breakdown by Location", styles["h2"]))
        rows = [["Level", "Section", "Total", "Critical", "Open"]]
        for lb in report.level_breakdown:
            rows.append([lb.level, str(lb.section) if lb.section is not None else "—", str(lb.total), str(lb.critical), str(lb.open)])
        story.append(_table(rows, [30 * mm, 30 * mm, 30 * mm, 30 * mm, 30 * mm], styles))

    if report.corrective_actions:
        story.append(Paragraph("Corrective Actions", styles["h2"]))
        rows = [["Pillar", "Action", "Owner", "Completed"]]
        for a in report.corrective_actions:
            rows.append([
                _PILLAR_LABEL.get(a.pillar, a.pillar),
                Paragraph(a.action, styles["cell"]),
                a.owner or "—",
                _fmt_date(a.completed_at) if a.completed_at else "Outstanding",
            ])
        story.append(_table(rows, [22 * mm, 74 * mm, 26 * mm, 28 * mm], styles))

    if report.issue_snapshot:
        story.append(Paragraph("Issue Register", styles["h2"]))
        story.append(Paragraph(
            "Recorded as it stood at the time this return was filed.", styles["small"]
        ))
        story.append(Spacer(1, 4))
        rows = [["Type", "Pillar", "Severity", "Status", "Location", "Raised", "Resolved"]]
        for e in report.issue_snapshot:
            rows.append([
                e.issue_type.replace("_", " ").title(), _PILLAR_LABEL.get(e.pillar, e.pillar),
                e.severity, e.status.title(), f"{e.level}-{e.section}",
                _fmt_date(e.created_at), _fmt_date(e.resolved_at) if e.resolved_at else "—",
            ])
        story.append(_table(rows, [26 * mm, 20 * mm, 22 * mm, 20 * mm, 18 * mm, 24 * mm, 24 * mm], styles))

    if report.declaration:
        story.append(Paragraph("Declaration", styles["h2"]))
        story.append(Paragraph(report.declaration.statement, styles["body"]))
        story.append(Spacer(1, 10))
        story.append(HRFlowable(width=60 * mm, thickness=0.6, color=_INK, hAlign="LEFT"))
        story.append(Paragraph(
            f"{report.declaration.declared_by_name or 'Signatory'} &nbsp;·&nbsp; "
            f"{_fmt_dt(report.declaration.signed_at)}",
            styles["small"],
        ))

    if report.regulator_findings:
        f = report.regulator_findings
        story.append(Paragraph("Regulatory Findings", styles["h2"]))
        story.append(Paragraph(f"Verdict: <b>{_STATUS_LABEL.get(f.verdict, f.verdict)}</b>", styles["body"]))
        if f.findings:
            story.append(Spacer(1, 4))
            for item in f.findings:
                story.append(Paragraph(f"•  {item}", styles["body"]))
        if f.directives:
            story.append(Spacer(1, 8))
            rows = [["Priority", "Directive", "Due"]]
            for d in f.directives:
                rows.append([
                    _PRIORITY_LABEL.get(d.priority, d.priority),
                    Paragraph(d.text, styles["cell"]),
                    _fmt_date(d.due_at) if d.due_at else "—",
                ])
            story.append(_table(rows, [25 * mm, 105 * mm, 20 * mm], styles))

    if report.notes:
        story.append(Paragraph("Notes", styles["h2"]))
        story.append(Paragraph(report.notes, styles["body"]))

    doc.build(story)
    return buf.getvalue()
