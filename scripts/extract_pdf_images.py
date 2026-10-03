"""Extract candidate screenshots from report PDFs.
Usage: python scripts/extract_pdf_images.py
Writes asset-candidates/<project>/p<page>-<n>.png for embedded images >= 600px wide.
"""
from pathlib import Path
import pymupdf

DEGREE = Path(r"D:\backup\Nurhan\UCSI\Degree")
SOURCES = {
    "stocksense": [DEGREE / "Y3S1/Project Design and Implementation/Document/1002267337_StockSenseReport.pdf"],
    "jomlah": [DEGREE / "Y3S2/Web Programming/Assignment/Document/DONE/Report_JOMLAH - Centralize Event Management App.pdf"],
    "fuzzy-logic": [DEGREE / "Y3S2/Intelligent System/Assignment/Document/Done/1002267337_Report_FuzzyLogicStudentPerformance.pdf"],
    "fixer": [
        DEGREE / "Y2S3/BIC3203 Business Case Project/Assignment/BizCaseDoc/Fixer_BusinessCaseDocument.pdf",
        DEGREE / "Y2S3/BIC3203 Business Case Project/Assignment/FixerBizCase/User Manual.pdf",
    ],
}
OUT = Path("asset-candidates")

for project, pdfs in SOURCES.items():
    dest = OUT / project
    dest.mkdir(parents=True, exist_ok=True)
    for pdf in pdfs:
        doc = pymupdf.open(pdf)
        tag = "um" if "User Manual" in pdf.name else "r"
        for pno, page in enumerate(doc, start=1):
            for n, img in enumerate(page.get_images(full=True), start=1):
                pix = pymupdf.Pixmap(doc, img[0])
                if pix.width < 600:
                    continue
                if pix.n - pix.alpha >= 4:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                pix.save(dest / f"{tag}-p{pno:03d}-{n}.png")
        print(project, pdf.name, "done")
