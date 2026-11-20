# Glossary

| Term | Meaning |
|---|---|
| AI assistant | A chat tool such as Claude, ChatGPT or Copilot that answers questions in everyday language. With an MCP server plugged in, it can look things up in sources it could not reach on its own. |
| API | Application programming interface: a way for one computer system to ask another for data or to do something, without a person in between. Many government services offer APIs alongside their websites. |
| API catalogue | A list of APIs with what each does, who provides it and where its documentation is. The UK public sector API catalogue is at api.gov.uk; api_search reads it at a pinned commit. |
| CKAN | The open-source catalogue software behind data.gov.uk. Its "action API" is what this server calls. |
| Class | A kind of thing in xGov MEM, for example Dataset or DataService. |
| Co-design | Designing a service with the people who will use it, not only for them: they shape the personas, journeys and changes. |
| Crosswalk | A mapping from one metadata format to another; here, from a data.gov.uk entry to xGov MEM. |
| CURIE | A short form of a web address, written prefix:name. For example, `dcat:Dataset`. |
| DAM policy | The cross-government policy on critical data assets (the successor to the Essential Shared Data Asset policy), with returns to GDS from January 2027. |
| Data champion | Someone who promotes good data practice in their own organisation, often alongside their main job. |
| Data exchange | Data passing from one organisation to another for a stated purpose, such as payroll earnings going from HMRC to DWP so Universal Credit can be worked out. |
| Data service | In DCAT, a set of operations, such as an API, that gives access to datasets or data processing. DCAT-AP-UK describes APIs this way, so they can be catalogued like datasets. |
| data.gov.uk | The UK's national catalogue of public sector data. |
| DCAT | Data Catalog Vocabulary, the W3C standard for describing datasets in catalogues. xGov MEM builds on it. |
| Distribution | One available form of a dataset, such as a CSV file or an API. |
| Finding | One problem the validator reports, with a severity, a path and a message. |
| Information sharing agreement | A written agreement between organisations setting out what personal data they share, why, how, for how long and under which law. Agreements under the Digital Economy Act 2017 are listed on a public register. |
| Legal gateway | The law that allows one public body to share data with another for a particular purpose. Without one, a body may not be allowed to share, even when sharing would help. |
| LinkML | The modelling language xGov MEM is written in. |
| MCP | Model Context Protocol: an open standard for connecting AI assistants to tools and data. |
| MCP prompt | A ready-made task an MCP server offers to an AI assistant, such as 'map the data exchanges behind a journey'. It is text that asks the assistant to use the tools; it does not act by itself. |
| MCP server | A program that offers tools and resources to an AI assistant using MCP. This repository is one. |
| Metadata | Data about data: the title, description, publisher, licence, dates and format that tell you what a dataset is and whether you can use it. |
| National Data Library | The UK government's programme, led by DSIT with GDS, to make public sector data easier to find and use. Since early 2026 the data.gov.uk website has been turning into it. The NDL in this project's name. |
| Open standard | A published, openly available specification that anyone can use, so that different systems and organisations can work together without being tied to one supplier. |
| Persona | A short description of a type of user: their context, goals and pain points. A proto-persona is written from assumptions and has not yet been tested with real users. |
| Provenance label | How sure a stated fact is: V verified at the primary source, S found through search, K background knowledge, U unconfirmed. |
| Read-only | Only looks at information; never changes, adds or deletes anything. Every tool in this server is read-only. |
| Recommended attribute | An attribute xGov MEM advises but does not require. Missing ones give warnings, not errors. |
| Required attribute | An attribute a record must have to meet xGov MEM. |
| Service blueprint | A diagram of a journey in lanes: what the person does and sees (front stage), what happens behind it (back stage) and what supports it. |
| Shared identifier | A key two organisations both use for the same thing, such as a company number, VAT number, EORI number, commodity code or address reference, so their data can be joined. |
| Slot | LinkML's word for an attribute. |
| Tool | A single action an MCP server offers, such as `metadata_validate`. |
| User journey | The stages a person goes through to reach a goal with a service, from first need to done. |
| Vaccination | Proving a check works by breaking the thing it guards and showing that the check fails. |
| xGov MEM | The UK Cross-Government Metadata Exchange Model: the endorsed model for exchanging metadata about datasets and data services across government. |
