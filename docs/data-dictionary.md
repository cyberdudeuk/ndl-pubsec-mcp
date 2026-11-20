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


## `api_search`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| query | in | string | 2 to 200 characters | Words to find in an API's name, provider or description; every word must match somewhere |
| provider | in | string, optional | 2 to 120 letters, digits, spaces and `&'(),.-` | Provider name or id, for example `hm-revenue-customs` |
| limit | in | integer | 1 to 25, default 10 | APIs to return |
| sources | out | object | | `catalogue` (repository, file, commit, commitDate, licence, count) and `named` (about, count) |
| total, returned | out | integer | | Matches found and returned |
| apis[] | out | array | | `name`, `provider`, `providerId`, `description` (at most 400 characters), `url`, `documentation`, `dateUpdated`, `access` (named sources), `source`, `inCatalogue` |
| note | out | string | | Listing is not endorsement; the server never calls the APIs |

## `server_search`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| query | in | string, optional | 2 to 100 characters | Words to find in a server's title or description; leave out to list all |
| servers[] | out | array | | `id`, `title`, `status` (this server, estate, or candidate awaiting review and not endorsed), `repository` or `url`, `description`, `tools`, `transport`, `checked`, `provenance` |
| asOf | out | date | | When the register was last checked |

## `exchange_search`

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| query | in | string, optional | 2 to 200 characters | Words for a journey, organisation, data item or identifier; every word must match the start of a word in the exchange; leave out to list all |
| party | in | string, optional | Letters, digits, spaces and `& ' ( ) , . -` only; up to 80 characters | Only exchanges involving this organisation |
| audience | in | enum, optional | `Citizen`, `Business`, `Public body` | Only journeys for this audience |
| exchanges[] | out | array | | `id`, `title`, `journey`, `audience`, `parties[]`, `flows`, `purpose`, `mechanism`, `sharedIdentifiers[]`, `standards[]` (ids for `standard_explain`), `apiQueries[]` (for `api_search`), `scale`, `legalBasis`, `notes`, `sources[]`, `provenance`, `checked` |
| register | out | object | | Counts from the Digital Economy Act register of information sharing agreements: `agreements`, `byPower`, `byMethod`, `topPairs`, with its `limits` |

## `standard_explain`: domain filter

| Field | Direction | Type | Rules | Meaning |
|---|---|---|---|---|
| domain | in | enum, optional | One of the register's `domains` | List only the standards in this domain |
| standards[] | out | array | | Each adds `domain`, `obligation` (Mandatory, Endorsed, Recommended, Voluntary, In review, Proposed), `appliesTo` and `publisher` |

## MCP prompts

Ready-made tasks an assistant can offer. Each is text that asks the assistant to use the tools; none acts by itself.

| Prompt | Argument | What it asks for |
|---|---|---|
| `journey-exchanges` | journey | The exchanges, APIs and standards behind a journey, and what still relies on email, files or paper |
| `standards-for-a-service` | service | The standards a service must meet, grouped by domain, Mandatory first |
| `check-a-catalogue-record` | dataset | A dataset's gaps against xGov MEM, with draft fixes |

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
