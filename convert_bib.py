#!/usr/bin/env python3
"""
Convert papers.bib to HTML for research page
"""

import re
from pathlib import Path


def clean_latex(text):
    """Clean LaTeX special characters"""
    # Replace LaTeX encoded special characters
    text = text.replace(r'\r{A}', 'Å')
    text = text.replace(r'\AA{}', 'Å')
    text = text.replace(r"\'e", 'é')
    text = text.replace(r'\v{s}', 'š')
    # Remove curly braces
    text = text.replace('{', '').replace('}', '')
    return text


def parse_bib_file(bib_path):
    """Parse BibTeX file and extract publication entries"""
    with open(bib_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Pre-process LaTeX characters before parsing
    content = content.replace(r'\r{A}', 'Å')
    content = content.replace(r'\AA{}', 'Å')
    content = content.replace(r"\'e", 'é')
    content = content.replace(r'\v{s}', 'š')

    # Split into individual entries
    entries = re.findall(r'@\w+\{[^@]+\}', content, re.DOTALL)

    papers = []
    for entry in entries:
        paper = {}

        # Extract title
        title_match = re.search(r'title\s*=\s*["{]([^"}]+)["}]', entry, re.DOTALL)
        if title_match:
            title = re.sub(r'\s+', ' ', title_match.group(1).strip())
            paper['title'] = clean_latex(title)

        # Extract authors
        author_match = re.search(r'author\s*=\s*["{]([^"}]+)["}]', entry, re.DOTALL)
        if author_match:
            authors = author_match.group(1).strip()
            # Clean up author names
            authors = re.sub(r'\s+', ' ', authors)
            paper['authors'] = clean_latex(authors)

        # Extract year
        year_match = re.search(r'year\s*=\s*["{](\d{4})["}]', entry)
        if year_match:
            paper['year'] = year_match.group(1)

        # Extract journal
        journal_match = re.search(r'journal\s*=\s*["{]([^"}]+)["}]', entry, re.DOTALL)
        if journal_match:
            journal = journal_match.group(1).strip()
            journal = re.sub(r'\s+', ' ', journal)
            paper['journal'] = journal

        # Extract volume
        volume_match = re.search(r'volume\s*=\s*["{]([^"}]+)["}]', entry)
        if volume_match:
            paper['volume'] = volume_match.group(1).strip()

        # Extract pages
        pages_match = re.search(r'pages\s*=\s*["{]([^"}]+)["}]', entry)
        if pages_match:
            paper['pages'] = pages_match.group(1).strip()

        # Extract arXiv ID
        eprint_match = re.search(r'eprint\s*=\s*["{]([^"}]+)["}]', entry)
        if eprint_match:
            paper['arxiv'] = eprint_match.group(1).strip()

        # Extract DOI
        doi_match = re.search(r'doi\s*=\s*["{]([^"}]+)["}]', entry)
        if doi_match:
            paper['doi'] = doi_match.group(1).strip()

        if paper:
            papers.append(paper)

    # Sort by year (newest first)
    papers.sort(key=lambda x: int(x.get('year', '0')), reverse=True)

    return papers


def highlight_author_name(authors):
    """Highlight Åsmund Folkestad with initials Å.F."""
    # Replace full name with highlighted initials
    highlighted = re.sub(
        r'Folkestad,\s*Åsmund',
        '<span class="highlight-author">Å.F.</span>',
        authors
    )
    # Also handle if name appears in different order
    highlighted = re.sub(
        r'Åsmund\s+Folkestad',
        '<span class="highlight-author">Å.F.</span>',
        highlighted
    )
    return highlighted


def format_paper_html(paper):
    """Format a single paper as HTML"""
    html = []

    # Title with link
    title = paper.get('title', 'Untitled')
    if 'arxiv' in paper:
        link = f"https://arxiv.org/abs/{paper['arxiv']}"
    elif 'doi' in paper:
        link = f"https://doi.org/{paper['doi']}"
    else:
        link = None

    if link:
        html.append(f'<a href="{link}" target="_blank" class="paper-title">{title}</a>')
    else:
        html.append(f'<span class="paper-title">{title}</span>')

    # Authors with highlighting
    if 'authors' in paper:
        authors = highlight_author_name(paper['authors'])
        html.append(f'<div class="paper-authors">{authors}</div>')

    # Venue and year
    venue_parts = []
    if 'journal' in paper:
        venue = paper['journal']
        if 'volume' in paper:
            venue += f" {paper['volume']}"
        if 'pages' in paper:
            venue += f", {paper['pages']}"
        venue_parts.append(venue)
    elif 'arxiv' in paper:
        venue_parts.append(f"arXiv:{paper['arxiv']}")

    if 'year' in paper:
        venue_parts.append(f"({paper['year']})")

    if venue_parts:
        html.append(f'<div class="paper-venue">{" ".join(venue_parts)}</div>')

    return '<div class="paper-entry">\n    ' + '\n    '.join(html) + '\n</div>'


def generate_html(papers):
    """Generate complete HTML for publications"""
    html_parts = ['<div class="publications-list">']

    for paper in papers:
        html_parts.append(format_paper_html(paper))

    html_parts.append('</div>')

    return '\n\n'.join(html_parts)


if __name__ == '__main__':
    bib_path = Path('_bibliography/papers.bib')

    if not bib_path.exists():
        print(f"Error: {bib_path} not found")
        exit(1)

    papers = parse_bib_file(bib_path)
    html = generate_html(papers)

    print(html)
    print(f"\n\n<!-- Generated {len(papers)} publications -->")
