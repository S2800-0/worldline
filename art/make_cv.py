# Builds the public CV: same document, with the GPA figures properly removed
# (redacted from the file, not just covered) and the Portfolio link updated.
#   python art/make_cv.py <source.pdf> public/shahesta-salama-cv.pdf [portfolio-url]
import sys
import fitz

src, dest = sys.argv[1], sys.argv[2]
portfolio = sys.argv[3] if len(sys.argv) > 3 else None
doc = fitz.open(src)
page = doc[0]

# The GPA line runs on into the "A grades" line, so replace both as one block.
start = page.search_for("Cumulative GPA:")[0]
end = page.search_for("Analysis")[0]
sample = next(
    span
    for block in page.get_text("dict")["blocks"]
    for line in block.get("lines", [])
    for span in line["spans"]
    if "A grades" in span["text"]
)
color = fitz.sRGB_to_pdf(sample["color"])
area = fitz.Rect(start.x0 - 1, start.y0 - 0.5, page.rect.width - 40, end.y1 + 0.5)
page.add_redact_annot(area)
page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
page.insert_text(
    (start.x0, start.y1 - 2.4),
    "A grades in Computer Networks, Neural Networks, Data Analysis",
    fontsize=sample["size"],
    fontname="helv",
    color=color,
)

if portfolio:
    for link in page.get_links():
        rect = link["from"]
        if "Portfolio" in page.get_textbox(rect):
            link["uri"] = portfolio
            page.update_link(link)

doc.save(dest, garbage=4, deflate=True, clean=True)
