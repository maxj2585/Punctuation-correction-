# Style-guide alignment

The site's checks follow three references, per the maintainer's request:

1. [Purdue OWL punctuation guide](https://owl.purdue.edu/owl/general_writing/punctuation/punctuation/index.html) (Brief Overview of Punctuation and its sub-pages)
2. [Texas A&M University Writing Center, *Punctuation, Grammar, Style, & Usage: Twelve Guidelines*](https://writingcenter.tamu.edu/writing-speaking-guides) (2021)
3. [University of Edinburgh IAD, *Study Guide: Grammar & Punctuation*](https://www.docs.hss.ed.ac.uk/iad/Researchers/Research_staff/Study_Guide_Grammar_&_Punctuation_v2.0_.pdf) (v2.0)

The engine is a pinned snapshot of [Harper](https://github.com/Automattic/harper), which implements standard edited-American-English punctuation rules. This page records how each guide rule maps to what the site actually checks, in **Punctuation & spacing** mode.

## Covered by the engine

| Guide rule | Engine coverage |
| --- | --- |
| End sentences with the right terminal punctuation; one end mark per sentence | Terminal-punctuation and spacing rules (`MissingSpace`, `Spaces`) |
| Capitalize the first word of a sentence | `SentenceCapitalization` (sentences of six words or more; the engine skips short, label-like lines by design) |
| One space between words; no double spaces; no stray space before punctuation | `Spaces` and space-before-punctuation rules |
| Space after `. ! ? ;` | `MissingSpace` |
| Ellipsis is three dots (or the `…` character) | `use_ellipsis_character`, `ellipsis_length` |
| Quotation marks come in pairs; spacing around quotes | `unclosed_quotes`, `quote_spacing` |
| Apostrophes: contractions, possessives, the right apostrophe character | `wrong_apostrophe` plus contraction and possessive rules |
| Hyphens and dashes: `--` to en dash, `---` to em dash | `dashes` |
| Oxford (serial) comma in lists | `oxford_comma` rule (the guides note this is a house-style choice; the engine flags where it is confident) |

## Added at the site layer (this project)

| Guide rule | Site check |
| --- | --- |
| One end mark, not a stack: `!!`, `??`, `!!!` | `repeatedEndMarkIssues`: collapses the run to a single mark. `?!` stays acceptable, so only doubled identical marks or runs of three or more are flagged |
| Space after `,` and `:` before the next word | `missingSpaceIssues`: the engine covers `. ! ? ;` but not these two. Digits (`1,000`, `9:30`) and URLs (`https://`) are untouched |
| A sentence left without any ending punctuation | `missingEndPunctuation`: offers the period |

## Judgment calls the guides leave to the writer

Not automated, because they depend on meaning rather than mechanical form: restrictive vs nonrestrictive clauses (that/which), commas around essential vs nonessential elements, comma placement after introductory elements (the guides allow omission after short phrases), integrating quotations with a colon or comma, subject-verb agreement, pronoun reference, parallelism, and active vs passive voice. The **All Harper checks** mode surfaces the grammar rules the engine does cover; the punctuation filter intentionally excludes them.
