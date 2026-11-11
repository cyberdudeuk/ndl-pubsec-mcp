# Data dictionary

Inputs and outputs of every tool. Types are JSON types. Every output also carries `ok` (true or false).

## `catalogue_search`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| query | in | string | 2 to 200 characters | What to look for |
| organisation | in | string, optional | lower-case letters, digits and hyphens | data.gov.uk publisher slug |
| limit | in | integer | 1 to 20, default 10 | Results to return |
| offset | in | integer | 0 to 1000, default 0 | Results to skip |
| source | out | string | | API base URL used |
| total | out | integer | | Matches in the catalogue |
| results[] | out | array | | `id`, `name`, `title`, `publisher`, `publisherSlug`, `licence`, `modified` (date), `formats` (upper-case), `url` |

## `dataset_describe`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| id | in | string | 2 to 100 letters, digits, `_` or `-` | data.gov.uk dataset id or slug |
| dataset | out | object | | The summary fields above, plus `description` (at most 4,000 characters) and `distributions[]` (`title`, `format`, `url`, `lastModified`, at most 50) |
| xgovMem.draftRecord | out | object | | xGov MEM Dataset record drafted from the catalogue entry, with only the fields the entry holds |
| xgovMem.notes | out | string[] | | What was assumed or left out, and why |
| xgovMem.valid | out | boolean | | Whether the draft meets xGov MEM |
| xgovMem.missingOrInvalid | out | Finding[] | | See Finding |

## `metadata_validate`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| record | in | object | | Metadata record using xGov MEM attribute names |
| className | in | enum, optional | ContactPoint, DataService, Dataset, Distribution, Organisation | Class to check against. Inferred from `type` if left out |
| className | out | string | | Class checked |
| valid | out | boolean | | True when there are no errors |
| errors, warnings | out | integer | | Exact counts, including findings left out by the cap |
| findings[] | out | Finding[] | at most 100 | See Finding. Capped so a hostile record cannot inflate the reply (D-020) |
| omitted | out | integer | ≥ 0 | Findings left out of `findings[]` by the cap |
| model | out | object | | `repository`, `commit`, `commitDate` of the xGov MEM version used |

## `standard_explain`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| id | in | string, optional | at most 60 characters | Standard id or part of its name. Leave it out to list all |
| standard / standards[] | out | object(s) | | `id`, `name`, `purpose`, `status`, `licence`, `link`, `useWith`, `provenance` (V, S, K or U), `checked` (date), `evidence` |
| asOf, note, catalogue | out | string | | When the register was compiled, its caveat, and the DSA catalogue link |

## `term_lookup`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| query | in | string, optional | 2 to 100 characters | Words to look for in labels, alternative labels and definitions |
| id | in | string, optional | letters, digits, `_` and `-`, 2 to 60 | An exact term id |
| limit | in | integer | 1 to 25, default 10 | How many terms to return |
| vocabulary | out | object | | `source`, `terms`, `certified`, `bound`, and counts `byStatus`, `byDraftedBy`, `byReviewLevel` |
| term / terms[] | out | Term | | See Term |

## `domain_list`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| (none) | in | | | |
| asOf, about | out | string | | When the register was checked, and what it is |
| domains[] | out | object | | `domain`, `title`, `repository`, `manifest`, `self`, `description`, `tools[]`, `safety`, `provenance`, `checked`, and for other servers `vendoredFrom` (owner/repo@commit) and any `note` |

## Term

| Field | Type | Meaning |
|---|---|---|
| id, label | string | The term's id and preferred label |
| altLabels[] | string | Alternative labels |
| definition | string | The definition, as the register holds it |
| certification | object | `status`, `draftedBy` (`human`, `ai-assisted`, `ai`, `unknown`), `reviewLevel` (`H0` to `H5`, `unknown`), `certified` (true only when endorsed after H2 or above), `reason` |
| provenance | string or null | Where the definition came from |
| bindings[] | string | Columns or SQL attributes the term maps to (empty when unbound) |
| broader[], related[] | string | Links to other terms |

## Finding

| Field | Type | Meaning |
|---|---|---|
| severity | `error` or `warning` | Errors must be fixed. Warnings are recommendations |
| path | string | Where in the record, for example `contactPoint.email` or `creator[0]` |
| rule | string | One of `required`, `recommended`, `unknown-attribute`, `range`, `single-valued`, `multivalued`, `designates-type`, `class`, `shape` |
| message | string | Plain-English explanation |

## Resources

| URI | Content |
|---|---|
| `ndl-pubsec-mcp://xgov-mem/rules` | The compiled xGov MEM rule set (organisation list summarised as a count) |
| `ndl-pubsec-mcp://standards` | The open standards register |
| `ndl-pubsec-mcp://federation` | The MCP servers in the same estate (same as `domain_list`) |
