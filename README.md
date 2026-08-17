# brand-tokens-v1

Design tokens for Universal Branding, plus a sample landing page that consumes all of them.

**Live page:** https://anujprajapatiii.github.io/brand-tokens-v1/

## Layout

| Path | What it is |
| --- | --- |
| `sample-tokens.json` | The token source. 210 tokens across 15 collections. |
| `build.mjs` | Resolves the file into CSS custom properties + reference data. |
| `check.mjs` | Asserts every token is declared, resolved, and rendered. |
| `docs/index.html` | The landing page (a fictional product, "Meridian"). |
| `docs/styles.css` | Page styles. Every value comes from a token — no raw hex. |
| `docs/tokens.css` | **Generated.** All 210 tokens as custom properties. |
| `docs/token-data.js` | **Generated.** Token inventory for the reference section. |
| `docs/reference.js` | Renders the reference appendix from that inventory. |
| `.github/workflows/pages.yml` | Builds, verifies, and deploys `docs/` to GitHub Pages. |

```
node build.mjs   # regenerate docs/tokens.css and docs/token-data.js
node check.mjs   # verify coverage
```

Re-run both after editing `sample-tokens.json`. CI runs `build.mjs`, fails the job if
the committed output is stale (`git diff --exit-code -- docs/`), runs `check.mjs`, and
then deploys — so a token change that isn't rebuilt cannot reach the published page.

## Token coverage

All 210 tokens are declared as custom properties and appear on the page:

- **139** paint the landing page itself — every `bg`, `text`, `icon`, `border`,
  `colors`, `spacing`, and `borderRadius` token, including all 62 `-hover` states,
  which are wired to real `:hover` rules rather than just displayed.
- **71** are the raw colour ramps. They are consumed indirectly (all 106
  alias-backed tokens resolve to a `primitive.*` value) and shown explicitly in the
  reference appendix.

## Two things worth knowing about the source file

**1. The alias table is missing, and the ordering below is inferred.**

The `bg`, `text`, `icon`, and `border` layers store their values as Figma variable
aliases — `{ "id": "VariableID:75:117", "type": "VARIABLE_ALIAS" }` — and the export
does not include the table those ids point at. The referenced ids form one
contiguous run, `75:117`–`75:159`, which is exactly 43 slots, and `primitive.*`
holds exactly 43 colours. `ALIAS_RAMP_ORDER` in `build.mjs` lays the ramps into that
run in this order:

| Slots | Ramp |
| --- | --- |
| 117–128 | `neutral` (100 → white) |
| 129–135 | `brown` (50 → 600) |
| 136–139 | `amber` (100 → 400) |
| 140–145 | `blue` (100 → 600) |
| 146–149 | `green` (100 → 400) |
| 150–153 | `red` (100 → 400) |
| 154–159 | `yellow` (100 → 600) |

Every semantic name then lands on a sensible shade — `text.primary` → `neutral.600`,
`text.disabled` → `neutral.300`, `bg.black-solid` → `neutral.800` — and each status
family lands on its own hue with a clean tint → solid → hover progression
(`bg.error-primary` → `red.100`, hover → `red.200`, `bg.error-secondary` → `red.300`,
hover → `red.400`). The nine slots no semantic token references are the entire
`amber` ramp plus four odd shades, which is what an unused legacy ramp looks like.

This is strong evidence but it is still an inference. **If you can export the
variable table from Figma, check it against `ALIAS_RAMP_ORDER`.** Everything
downstream follows from that one constant.

**2. Seven root-level ramps exported as `#ffffff`.**

`red`, `blue`, `amber`, `brown`, `green`, `yellow`, and `neutral` at the top level
mirror the `primitive.*` structure exactly, but all 43 values came out of the export
as `#ffffff`. They are rendered as-is in the reference and flagged with the value
each one is expected to hold. No semantic token depends on them, so nothing on the
page is affected — but they should probably be re-exported or dropped.

Two smaller quirks, both rendered faithfully rather than corrected:

- `bg.tertiary` resolves to `yellow.500` (`#d17600`), a gold surface rather than a
  neutral one. It is used for the pricing ribbon.
- `bg.disabled-alt` and `border.disabled-alt` are both `neutral.100` (`#f6f7f8`),
  identical to `bg.primary` — so a read-only control is invisible on the page
  background. The form sits on a white panel so the state can be seen.
